import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BridgeError, type Inference } from '../src/protocol.ts';
import { cliFailure, parseResult, type Runner, runProcess } from '../src/runner.ts';
import { createBridge } from '../src/server.ts';

const key = 'test-only-bridge-key-with-at-least-32-characters';
const servers: ReturnType<typeof createBridge>[] = [];
afterEach(async () => {
	await Promise.all(
		servers.splice(0).map(
			(server) =>
				new Promise<void>((resolve) => {
					server.close(() => resolve());
					server.closeAllConnections();
				}),
		),
	);
});
async function start(runner?: Partial<Runner>, config = {}) {
	const infer = vi.fn(
		async (): Promise<Inference> => ({ text: 'Hello', inputTokens: 10, outputTokens: 2 }),
	);
	const server = createBridge(
		{ key, models: ['codex/default', 'claude/default'], ...config },
		{ infer, authenticated: async () => true, ...runner },
	);
	servers.push(server);
	server.listen(0, '127.0.0.1');
	await once(server, 'listening');
	const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	const post = (data: unknown, signal?: AbortSignal) =>
		fetch(`${url}/v1/chat/completions`, {
			method: 'POST',
			headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
			body: JSON.stringify(data),
			signal,
		});
	return { url, post, infer };
}
const request = {
	model: 'codex/default',
	messages: [{ role: 'user', content: 'Who has pickup today?' }],
};
const tool = {
	type: 'function',
	function: {
		name: 'findEvents',
		description: 'Read events',
		parameters: { type: 'object', properties: {}, additionalProperties: false },
	},
};

describe('CLI bridge HTTP contract', () => {
	it('requires the bridge key before reading requests or probing accounts', async () => {
		const authenticated = vi.fn(async () => true);
		const { url, infer } = await start({ authenticated });
		for (const path of ['/v1/models', '/v1/status', '/v1/chat/completions'])
			expect((await fetch(url + path)).status).toBe(401);
		expect(infer).not.toHaveBeenCalled();
		expect(authenticated).not.toHaveBeenCalled();
		expect((await fetch(`${url}/health`)).status).toBe(200);
	});
	it('lists only authenticated backends and checks status without inference', async () => {
		const { url, infer } = await start({ authenticated: async (b) => b === 'claude' });
		const result = await fetch(`${url}/v1/models`, { headers: { authorization: `Bearer ${key}` } });
		expect(await result.json()).toMatchObject({ data: [{ id: 'claude/default' }] });
		expect(infer).not.toHaveBeenCalled();
	});
	it('explains when neither CLI is signed in', async () => {
		const { url } = await start({ authenticated: async () => false });
		expect(
			(await fetch(`${url}/v1/models`, { headers: { authorization: `Bearer ${key}` } })).status,
		).toBe(401);
	});
	it('returns text and reported usage, without inventing subscription costs', async () => {
		const { post, infer } = await start();
		const result = await post(request);
		expect(result.status).toBe(200);
		const answer = await result.json();
		expect(answer).toMatchObject({
			choices: [{ message: { content: 'Hello' }, finish_reason: 'stop' }],
			usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
		});
		expect(answer).not.toHaveProperty('usage.cost');
		expect(infer.mock.calls[0]?.slice(0, 2)).toEqual(['codex', 'default']);
	});
	it('routes Claude independently and carries the complete conversation', async () => {
		const infer = vi.fn(async () => ({ text: 'Done' }));
		const { post } = await start({ infer });
		await post({
			...request,
			model: 'claude/default',
			messages: [
				...request.messages,
				{ role: 'assistant', content: 'Which child?' },
				{ role: 'user', content: 'The older one' },
			],
		});
		expect(infer.mock.calls[0]?.slice(0, 3)).toMatchObject([
			'claude',
			'default',
			{ prompt: expect.stringContaining('The older one') },
		]);
	});
	it('frames buffered results as OpenAI SSE', async () => {
		const { post } = await start();
		const result = await post({
			...request,
			stream: true,
			stream_options: { include_usage: true },
		});
		expect(result.headers.get('content-type')).toBe('text/event-stream');
		const text = await result.text();
		expect(text).toContain('"content":"Hello"');
		expect(text).toContain('"finish_reason":"stop"');
		expect(text).toContain('"total_tokens":12');
		expect(text).toContain('data: [DONE]');
	});
	it('returns proposed tools to the host without executing them', async () => {
		const { post } = await start({
			infer: async () => ({
				text: JSON.stringify({ text: '', tool_calls: [{ name: 'findEvents', arguments: '{}' }] }),
			}),
		});
		const result = await post({ ...request, tools: [tool], stream: true });
		expect(await result.text()).toContain('"finish_reason":"tool_calls"');
	});
	it('closes tools when the host asks for a final answer', async () => {
		const infer = vi.fn(async () => ({ text: 'Here is your answer' }));
		const { post } = await start({ infer });
		expect((await post({ ...request, tools: [tool], tool_choice: 'none' })).status).toBe(200);
		expect(infer.mock.calls[0]?.slice(0, 3)).toMatchObject(['codex', 'default', { tools: [] }]);
	});
	it('rejects invented tools, invalid arguments and a missing required call', async () => {
		for (const tool_calls of [
			[{ name: 'Bash', arguments: '{}' }],
			[{ name: 'findEvents', arguments: 'not-json' }],
			[{ name: 'findEvents', arguments: '[]' }],
			[],
		]) {
			const { post } = await start({
				infer: async () => ({ text: JSON.stringify({ text: 'answer', tool_calls }) }),
			});
			expect((await post({ ...request, tools: [tool], tool_choice: 'required' })).status).toBe(502);
		}
	});
	it('supports JSON output requests and rejects malformed output', async () => {
		const { post } = await start({ infer: async () => ({ text: '{"items":[]}' }) });
		expect(
			(
				await post({
					...request,
					response_format: {
						type: 'json_schema',
						json_schema: {
							name: 'result',
							schema: { type: 'object', properties: { items: { type: 'array' } } },
						},
					},
				})
			).status,
		).toBe(200);
		const broken = await start();
		expect(
			(await broken.post({ ...request, response_format: { type: 'json_object' } })).status,
		).toBe(502);
	});
	it('rejects unsupported media, unknown models and unsupported endpoints before inference', async () => {
		const { url, post, infer } = await start();
		expect(
			(
				await post({
					...request,
					messages: [
						{
							role: 'user',
							content: [{ type: 'image_url', image_url: { url: 'data:image/png;base64,AAAA' } }],
						},
					],
				})
			).status,
		).toBe(400);
		expect((await post({ ...request, model: 'codex/../../etc/passwd' })).status).toBe(404);
		expect(
			(
				await fetch(`${url}/v1/embeddings`, {
					method: 'POST',
					headers: { authorization: `Bearer ${key}` },
				})
			).status,
		).toBe(404);
		expect(infer).not.toHaveBeenCalled();
	});
	it('caps request sizes and does not include submitted data in errors', async () => {
		const { post, infer } = await start({}, { maxBodyBytes: 100 });
		const result = await post({
			...request,
			messages: [{ role: 'user', content: 'private-message'.repeat(100) }],
		});
		expect(result.status).toBe(413);
		expect(await result.text()).not.toContain('private-message');
		expect(infer).not.toHaveBeenCalled();
	});
	it('preserves actionable auth, quota and timeout errors without raw diagnostics', async () => {
		for (const status of [401, 402, 429, 504]) {
			const { post } = await start({
				infer: async () => {
					throw new BridgeError(status, 'test_failure', 'Safe explanation');
				},
			});
			const response = await post(request);
			expect(response.status).toBe(status);
			expect(await response.json()).toMatchObject({ error: { message: 'Safe explanation' } });
		}
	});
	it('bounds concurrency and releases capacity after a failed request', async () => {
		let finish: (value: Inference) => void = () => {};
		const infer = vi.fn(
			() =>
				new Promise<Inference>((resolve) => {
					finish = resolve;
				}),
		);
		const { post } = await start({ infer }, { concurrency: 1 });
		const first = post(request);
		await vi.waitFor(() => expect(infer).toHaveBeenCalledTimes(1));
		expect((await post(request)).status).toBe(429);
		finish({ text: 'Done' });
		expect((await first).status).toBe(200);
		infer.mockImplementation(async () => {
			throw new BridgeError(401, 'auth', 'Login');
		});
		expect((await post(request)).status).toBe(401);
		expect((await post(request)).status).toBe(401);
	});
	it('cancels inference when its client disconnects', async () => {
		let cancelled = false;
		const { post } = await start({
			infer: async (_b, _m, _p, { signal }) =>
				new Promise((_resolve, reject) => {
					signal.addEventListener('abort', () => {
						cancelled = true;
						reject(new Error('cancelled'));
					});
				}),
		});
		const controller = new AbortController();
		const pending = post(request, controller.signal).catch(() => null);
		await new Promise((resolve) => setTimeout(resolve, 40));
		controller.abort();
		await pending;
		await vi.waitFor(() => expect(cancelled).toBe(true));
	});
});

describe('native CLI results and process lifecycle', () => {
	it('parses Codex JSONL and Claude structured output', () => {
		expect(
			parseResult('codex', {
				code: 0,
				stderr: '',
				stdout:
					'{"type":"item.completed","item":{"type":"agent_message","text":"Hello"}}\n{"type":"turn.completed","usage":{"input_tokens":8,"output_tokens":2}}\n',
			}),
		).toEqual({ text: 'Hello', inputTokens: 8, outputTokens: 2 });
		expect(
			parseResult('claude', {
				code: 0,
				stderr: '',
				stdout: '{"structured_output":{"ok":true},"usage":{"input_tokens":8,"output_tokens":2}}',
			}),
		).toEqual({ text: '{"ok":true}', inputTokens: 8, outputTokens: 2 });
	});
	it('refuses CLI errors even when the process exits successfully', () => {
		for (const [backend, stdout] of [
			['claude', '{"is_error":true,"result":"Not logged in"}'],
			['codex', '{"type":"turn.failed","error":{"message":"Not logged in"}}'],
		] as const)
			expect(() => parseResult(backend, { code: 0, stderr: '', stdout })).toThrow(
				expect.objectContaining({ status: 401 }),
			);
	});
	it('sanitizes raw errors containing family content', () => {
		for (const diagnostic of [
			'Not logged in private-secret',
			'Usage limit reached private-secret',
			'rate limited private-secret',
			'Unexpected private-secret',
		])
			expect(cliFailure({ code: 1, stdout: diagnostic, stderr: '' }).message).not.toContain(
				'private-secret',
			);
	});
	it('handles missing binaries, timeouts, cancellation and oversized output', async () => {
		const options = { signal: new AbortController().signal, timeoutMs: 1000 };
		await expect(runProcess('/nonexistent-famos-cli', [], '', options)).rejects.toMatchObject({
			status: 503,
		});
		await expect(
			runProcess(process.execPath, ['-e', 'setInterval(()=>{},1000)'], '', {
				...options,
				timeoutMs: 50,
			}),
		).rejects.toMatchObject({ status: 504 });
		const controller = new AbortController();
		const pending = runProcess(process.execPath, ['-e', 'setInterval(()=>{},1000)'], '', {
			...options,
			signal: controller.signal,
		});
		controller.abort();
		await expect(pending).rejects.toMatchObject({ status: 499 });
		await expect(
			runProcess(process.execPath, ['-e', 'process.stdout.write("x".repeat(5000))'], '', {
				...options,
				maxBytes: 100,
			}),
		).rejects.toMatchObject({ status: 502 });
	});
	it('preserves multibyte characters split across stdout chunks', async () => {
		const result = await runProcess(
			process.execPath,
			[
				'-e',
				'process.stdout.write(Buffer.from([0xc3]));setTimeout(()=>process.stdout.write(Buffer.from([0xa9])),10)',
			],
			'',
			{ signal: new AbortController().signal, timeoutMs: 1000 },
		);
		expect(result.stdout).toBe(String.fromCodePoint(0xe9));
	});
	it('passes prompts only through stdin with no shell expansion', async () => {
		const secret = 'private text with $(echo bad) and `echo bad`';
		const result = await runProcess(
			process.execPath,
			['-e', 'process.stdin.pipe(process.stdout)'],
			secret,
			{ signal: new AbortController().signal, timeoutMs: 1000 },
		);
		expect(result.stdout).toBe(secret);
		expect(result.code).toBe(0);
	});
});
