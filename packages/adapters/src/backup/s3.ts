import { createHash, randomBytes } from 'node:crypto';
import { AwsClient } from 'aws4fetch';
import type { S3Config } from './schemas.ts';
import {
	type BackupTarget,
	BackupTargetError,
	CONTROL_TIMEOUT_MS,
	chunked,
	httpError,
	isBackupFile,
	networkError,
	type RemoteFile,
	UPLOAD_TIMEOUT_MS,
} from './target.ts';

/** S3 needs at least 5 MiB per part but the last; 8 MiB keeps memory low and parts few. */
export const PART_SIZE = 8 * 1024 * 1024;

const encodeKey = (key: string) => key.split('/').map(encodeURIComponent).join('/');
const unescapeXml = (text: string) =>
	text
		.replaceAll('&lt;', '<')
		.replaceAll('&gt;', '>')
		.replaceAll('&quot;', '"')
		.replaceAll('&apos;', "'")
		.replaceAll('&amp;', '&');

/**
 * S3-compatible storage (AWS, Backblaze B2, Wasabi, MinIO, Cloudflare R2): SigV4 by `aws4fetch`,
 * our own single and multipart uploads. Parts are sliced from the stream one at a time, so memory
 * stays near one part. Retrying is left to the job queue (`retries: 0`).
 */
export function createS3Target(config: S3Config, fetchImpl: typeof fetch = fetch): BackupTarget {
	const client = new AwsClient({
		accessKeyId: config.accessKeyId,
		secretAccessKey: config.secretAccessKey,
		service: 's3',
		region: config.region,
		retries: 0,
	});
	const endpoint = new URL(config.endpoint);
	const base = config.pathStyle
		? `${endpoint.protocol}//${endpoint.host}${endpoint.pathname.replace(/\/$/, '')}/${config.bucket}`
		: `${endpoint.protocol}//${config.bucket}.${endpoint.host}${endpoint.pathname.replace(/\/$/, '')}`;
	const keyOf = (name: string) => (config.prefix ? `${config.prefix}/${name}` : name);
	const urlOf = (name: string, query = '') => `${base}/${encodeKey(keyOf(name))}${query}`;

	async function send(
		url: string,
		init: { method: string; body?: Buffer; headers?: Record<string, string> },
		timeoutMs = CONTROL_TIMEOUT_MS,
	): Promise<Response> {
		try {
			const signed = await client.sign(url, {
				method: init.method,
				...(init.body && { body: new Uint8Array(init.body) }),
				// A real payload hash, not UNSIGNED-PAYLOAD: every S3 clone accepts it, over http too.
				headers: {
					...init.headers,
					'x-amz-content-sha256': createHash('sha256')
						.update(init.body ?? '')
						.digest('hex'),
				},
			});
			const res = await fetchImpl(signed, {
				redirect: 'manual',
				signal: AbortSignal.timeout(timeoutMs),
			});
			if (!res.ok) {
				await res.body?.cancel().catch(() => undefined);
				throw httpError(res.status);
			}
			return res;
		} catch (error) {
			throw networkError(error);
		}
	}

	async function putSingle(name: string, body: Buffer) {
		await (await send(urlOf(name), { method: 'PUT', body }, UPLOAD_TIMEOUT_MS)).arrayBuffer();
	}

	async function putMultipart(name: string, first: Buffer, rest: AsyncGenerator<Buffer>) {
		const started = await send(urlOf(name, '?uploads'), { method: 'POST' });
		const uploadId = /<UploadId>([^<]+)<\/UploadId>/.exec(await started.text())?.[1];
		if (!uploadId) throw new BackupTargetError('bad_response', false);
		const id = encodeURIComponent(unescapeXml(uploadId));
		try {
			const etags: string[] = [];
			const upload = async (part: Buffer) => {
				const res = await send(
					urlOf(name, `?partNumber=${etags.length + 1}&uploadId=${id}`),
					{ method: 'PUT', body: part },
					UPLOAD_TIMEOUT_MS,
				);
				await res.arrayBuffer();
				const etag = res.headers.get('etag');
				if (!etag) throw new BackupTargetError('bad_response', false);
				etags.push(etag);
			};
			await upload(first);
			for await (const part of rest) await upload(part);
			const xml = `<CompleteMultipartUpload>${etags
				.map(
					(etag, i) =>
						`<Part><PartNumber>${i + 1}</PartNumber><ETag>${etag.replaceAll('"', '&quot;')}</ETag></Part>`,
				)
				.join('')}</CompleteMultipartUpload>`;
			const done = await send(
				urlOf(name, `?uploadId=${id}`),
				{ method: 'POST', body: Buffer.from(xml), headers: { 'content-type': 'application/xml' } },
				UPLOAD_TIMEOUT_MS,
			);
			// S3 may answer 200 and still report a failure in the body.
			if (/<Error>/.test(await done.text())) throw new BackupTargetError('multipart_failed', true);
		} catch (error) {
			// Unfinished parts are billed storage: abort, ignoring a failure of the abort itself.
			await send(urlOf(name, `?uploadId=${id}`), { method: 'DELETE' }).catch(() => undefined);
			throw error;
		}
	}

	return {
		async put(name, body) {
			const parts = chunked(body, PART_SIZE);
			const first = await parts.next();
			const head = first.done ? Buffer.alloc(0) : first.value;
			// One part or less: a single PUT. More: multipart (the generator hands out the rest).
			const second = head.length === PART_SIZE ? await parts.next() : undefined;
			if (!second || second.done) return putSingle(name, head);
			async function* rest() {
				yield second?.value as Buffer;
				yield* parts;
			}
			return putMultipart(name, head, rest());
		},

		async list() {
			const files: RemoteFile[] = [];
			const prefix = config.prefix ? `${config.prefix}/` : '';
			let token: string | undefined;
			do {
				const query = `?list-type=2&prefix=${encodeURIComponent(prefix)}${
					token ? `&continuation-token=${encodeURIComponent(token)}` : ''
				}`;
				const xml = await (await send(`${base}/${query}`, { method: 'GET' })).text();
				for (const block of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
					const key = unescapeXml(/<Key>([\s\S]*?)<\/Key>/.exec(block[1] ?? '')?.[1] ?? '');
					const name = key.slice(prefix.length);
					if (!key.startsWith(prefix) || name.includes('/') || !isBackupFile(name)) continue;
					const size = /<Size>(\d+)<\/Size>/.exec(block[1] ?? '')?.[1];
					const modified = /<LastModified>([^<]+)<\/LastModified>/.exec(block[1] ?? '')?.[1];
					files.push({
						name,
						size: size ? Number(size) : null,
						modifiedAt: modified ? Date.parse(modified) : null,
					});
				}
				token =
					/<IsTruncated>true<\/IsTruncated>/.test(xml) && /<NextContinuationToken>/.test(xml)
						? unescapeXml(
								/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/.exec(xml)?.[1] ?? '',
							)
						: undefined;
			} while (token);
			return files;
		},

		async delete(name) {
			await (await send(urlOf(name), { method: 'DELETE' })).arrayBuffer();
		},

		async test() {
			const probe = `famos-probe-${randomBytes(6).toString('hex')}.tmp`;
			await send(urlOf(probe), { method: 'PUT', body: Buffer.from('FamilyOS') }).then((r) =>
				r.arrayBuffer(),
			);
			await send(urlOf(probe), { method: 'DELETE' }).then((r) => r.arrayBuffer());
		},
	};
}
