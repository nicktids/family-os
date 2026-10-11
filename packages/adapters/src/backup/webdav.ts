import { randomBytes } from 'node:crypto';
import type { WebDavConfig } from './schemas.ts';
import {
	type BackupTarget,
	CONTROL_TIMEOUT_MS,
	httpError,
	isBackupFile,
	networkError,
	type RemoteFile,
	UPLOAD_TIMEOUT_MS,
} from './target.ts';

const PROPFIND_BODY =
	'<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:"><d:prop>' +
	'<d:getcontentlength/><d:getlastmodified/><d:resourcetype/></d:prop></d:propfind>';

const unescapeXml = (text: string) =>
	text
		.replaceAll('&lt;', '<')
		.replaceAll('&gt;', '>')
		.replaceAll('&quot;', '"')
		.replaceAll('&apos;', "'")
		.replaceAll('&amp;', '&');

/** The text of the first `<prefix:tag>…</prefix:tag>` in `xml`, whatever the namespace prefix. */
const tag = (xml: string, name: string) =>
	new RegExp(`<(?:[\\w.-]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w.-]+:)?${name}>`, 'i').exec(
		xml,
	)?.[1];

/**
 * WebDAV (Nextcloud, ownCloud, many NAS boxes): plain `fetch` with Basic authentication. The
 * upload is streamed with a `Content-Length`, because many servers behind PHP do not take chunked
 * bodies. Redirects are refused: replaying a streamed body is not possible, and the credentials
 * must not follow a redirect to another host. Use the address the server finally answers on.
 */
export function createWebDavTarget(
	config: WebDavConfig,
	fetchImpl: typeof fetch = fetch,
): BackupTarget {
	const authorization = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`;
	const urlOf = (name = '') => `${config.url}/${name ? encodeURIComponent(name) : ''}`;

	async function send(
		url: string,
		init: {
			method: string;
			body?: string | ReadableStream<Uint8Array>;
			headers?: Record<string, string>;
			timeoutMs?: number;
			/** Accept any status (MKCOL on an existing folder answers 405). */
			anyStatus?: boolean;
		},
	): Promise<Response> {
		try {
			const res = await fetchImpl(url, {
				method: init.method,
				headers: { authorization, ...init.headers },
				...(init.body !== undefined && { body: init.body }),
				// Required by Node's fetch for a stream body.
				...(init.body instanceof ReadableStream && { duplex: 'half' }),
				redirect: 'manual',
				signal: AbortSignal.timeout(init.timeoutMs ?? CONTROL_TIMEOUT_MS),
			} as RequestInit);
			if (!res.ok && !init.anyStatus) {
				await res.body?.cancel().catch(() => undefined);
				throw httpError(res.status);
			}
			return res;
		} catch (error) {
			throw networkError(error);
		}
	}

	/** Creates the folder; "already exists" (405) and every other answer are left to the PUT. */
	const ensureFolder = async () => {
		const res = await send(urlOf(), { method: 'MKCOL', anyStatus: true });
		await res.body?.cancel().catch(() => undefined);
	};

	return {
		async put(name, body, size) {
			await ensureFolder();
			const res = await send(urlOf(name), {
				method: 'PUT',
				body,
				headers: {
					'content-type': 'application/octet-stream',
					...(size !== undefined && { 'content-length': String(size) }),
				},
				timeoutMs: UPLOAD_TIMEOUT_MS,
			});
			await res.arrayBuffer();
		},

		async list() {
			const res = await send(urlOf(), {
				method: 'PROPFIND',
				body: PROPFIND_BODY,
				headers: { depth: '1', 'content-type': 'application/xml' },
			});
			const xml = await res.text();
			const files: RemoteFile[] = [];
			for (const block of xml.matchAll(
				/<(?:[\w.-]+:)?response(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w.-]+:)?response>/gi,
			)) {
				const entry = block[1] ?? '';
				const href = tag(entry, 'href');
				if (!href) continue;
				let name: string;
				try {
					name = decodeURIComponent(
						unescapeXml(href.trim()).split('/').filter(Boolean).at(-1) ?? '',
					);
				} catch {
					continue;
				}
				if (!isBackupFile(name)) continue;
				const length = tag(entry, 'getcontentlength')?.trim();
				const modified = tag(entry, 'getlastmodified')?.trim();
				files.push({
					name,
					size: length && /^\d+$/.test(length) ? Number(length) : null,
					modifiedAt: modified && !Number.isNaN(Date.parse(modified)) ? Date.parse(modified) : null,
				});
			}
			return files;
		},

		async delete(name) {
			await (await send(urlOf(name), { method: 'DELETE' })).arrayBuffer();
		},

		async test() {
			await ensureFolder();
			const probe = `famos-probe-${randomBytes(6).toString('hex')}.tmp`;
			await (await send(urlOf(probe), { method: 'PUT', body: 'FamilyOS' })).arrayBuffer();
			await (await send(urlOf(probe), { method: 'DELETE' })).arrayBuffer();
		},
	};
}
