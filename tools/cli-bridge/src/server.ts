import { timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { z } from 'zod';
import { BridgeError, CompletionSchema, completion, events, prepare } from './protocol.ts';
import type { Backend, Runner } from './runner.ts';

export const ConfigSchema = z.object({
	key: z.string().min(32).max(500),
	models: z
		.array(z.string().regex(/^(codex|claude)\/[a-zA-Z0-9._:-]+$/))
		.min(1)
		.max(100),
	timeoutMs: z.number().int().min(100).max(600_000).default(120_000),
	concurrency: z.number().int().min(1).max(8).default(2),
	maxBodyBytes: z.number().int().positive().default(2_097_152),
});
export type BridgeConfig = z.input<typeof ConfigSchema>;

function json(res: ServerResponse, status: number, value: unknown) {
	res.writeHead(status, {
		'content-type': 'application/json',
		'cache-control': 'no-store',
		'x-content-type-options': 'nosniff',
	});
	res.end(JSON.stringify(value));
}
function body(req: IncomingMessage, maxBytes: number): Promise<unknown> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		let bytes = 0;
		req.on('data', (chunk: Buffer) => {
			bytes += chunk.length;
			if (bytes > maxBytes) {
				chunks.length = 0;
				reject(
					new BridgeError(413, 'request_too_large', 'The request exceeds the bridge size limit.'),
				);
			} else chunks.push(chunk);
		});
		req.once('error', reject);
		req.once('end', () => {
			if (bytes > maxBytes) return;
			try {
				resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
			} catch {
				reject(new BridgeError(400, 'invalid_request', 'Send a JSON request.'));
			}
		});
	});
}

/** Only the inference bridge owns processes; FamilyOS continues to own every action and draft. */
export function createBridge(input: BridgeConfig, runner: Runner) {
	const config = ConfigSchema.parse(input);
	let active = 0;
	return createServer(async (req, res) => {
		const controller = new AbortController();
		req.once('aborted', () => controller.abort());
		res.once('close', () => {
			if (!res.writableEnded) controller.abort();
		});
		try {
			if (req.method === 'GET' && req.url === '/health') {
				json(res, 200, { ok: true });
				return;
			}
			const provided = Buffer.from(req.headers.authorization ?? '');
			const expected = Buffer.from(`Bearer ${config.key}`);
			if (provided.length !== expected.length || !timingSafeEqual(provided, expected))
				throw new BridgeError(401, 'authentication_required', 'A valid bridge key is required.');
			if (req.method === 'GET' && (req.url === '/v1/models' || req.url === '/v1/status')) {
				const backends = [...new Set(config.models.map((m) => m.split('/')[0] as Backend))];
				const statuses = Object.fromEntries(
					await Promise.all(backends.map(async (b) => [b, await runner.authenticated(b)])),
				);
				if (req.url === '/v1/status') {
					json(res, 200, { authenticated: statuses, active, capacity: config.concurrency });
					return;
				}
				const models = config.models.filter((m) => statuses[m.split('/')[0] ?? '']);
				if (!models.length)
					throw new BridgeError(
						401,
						'authentication_required',
						'Sign in to Codex or Claude Code in the bridge container first.',
					);
				json(res, 200, {
					object: 'list',
					data: models.map((id) => ({
						id,
						object: 'model',
						created: 0,
						owned_by: id.split('/')[0],
					})),
				});
				return;
			}
			if (req.method !== 'POST' || req.url !== '/v1/chat/completions')
				throw new BridgeError(404, 'not_found', 'This bridge supports text chat completions only.');
			const parsed = CompletionSchema.safeParse(await body(req, config.maxBodyBytes));
			if (!parsed.success)
				throw new BridgeError(
					400,
					'unsupported_request',
					'Unsupported chat request. Only text messages and function tools are supported; images, files, audio and embeddings are not supported.',
				);
			const request = parsed.data;
			if (!config.models.includes(request.model))
				throw new BridgeError(404, 'model_not_found', 'Choose a model listed by this bridge.');
			const prepared = prepare(request);
			if (active >= config.concurrency)
				throw new BridgeError(429, 'bridge_busy', 'The CLI bridge is busy. Try again shortly.');
			const slash = request.model.indexOf('/');
			const backend = request.model.slice(0, slash) as Backend;
			const model = request.model.slice(slash + 1);
			active++;
			try {
				const result = await runner.infer(backend, model, prepared, {
					signal: controller.signal,
					timeoutMs: config.timeoutMs,
				});
				if (controller.signal.aborted) return;
				const answer = completion(request, prepared, result);
				if (request.stream) {
					res.writeHead(200, {
						'content-type': 'text/event-stream',
						'cache-control': 'no-store',
						'x-accel-buffering': 'no',
					});
					res.end(events(answer));
				} else json(res, 200, answer);
			} finally {
				active--;
			}
		} catch (error) {
			if (controller.signal.aborted || res.destroyed) return;
			const failure =
				error instanceof BridgeError
					? error
					: new BridgeError(500, 'bridge_failed', 'The CLI bridge could not complete the request.');
			if (failure.status === 429) res.setHeader('retry-after', '15');
			json(res, failure.status, {
				error: { code: failure.code, message: failure.message, type: 'bridge_error' },
			});
		}
	});
}
