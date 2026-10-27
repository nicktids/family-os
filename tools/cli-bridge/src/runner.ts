import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { BridgeError, type Inference, type Prepared } from './protocol.ts';

export type Backend = 'codex' | 'claude';
export interface RunOptions {
	signal: AbortSignal;
	timeoutMs: number;
}
export interface Runner {
	infer(
		backend: Backend,
		model: string,
		prepared: Prepared,
		options: RunOptions,
	): Promise<Inference>;
	authenticated(backend: Backend): Promise<boolean>;
}
export interface ProcessResult {
	code: number | null;
	stdout: string;
	stderr: string;
}
/** No shell, no prompts in argv, bounded output, and the entire child process group is stopped. */
export function runProcess(
	binary: string,
	args: string[],
	input: string,
	options: RunOptions & { cwd?: string; maxBytes?: number },
): Promise<ProcessResult> {
	return new Promise((resolve, reject) => {
		if (options.signal.aborted) {
			reject(new BridgeError(499, 'cancelled', 'The request was cancelled.'));
			return;
		}
		const child = spawn(binary, args, {
			cwd: options.cwd,
			detached: true,
			stdio: ['pipe', 'pipe', 'pipe'],
			env: { ...process.env, CLAUDECODE: undefined },
		});
		let stdout = '';
		let stderr = '';
		let bytes = 0;
		let settled = false;
		const kill = () => {
			if (child.pid) {
				try {
					process.kill(-child.pid, 'SIGKILL');
				} catch {
					child.kill('SIGKILL');
				}
			}
		};
		const finish = (error?: BridgeError, code: number | null = null) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			options.signal.removeEventListener('abort', abort);
			if (error) {
				kill();
				reject(error);
			} else resolve({ code, stdout, stderr });
		};
		const abort = () => finish(new BridgeError(499, 'cancelled', 'The request was cancelled.'));
		const timer = setTimeout(
			() => finish(new BridgeError(504, 'timeout', 'The CLI did not answer in time.')),
			options.timeoutMs,
		);
		options.signal.addEventListener('abort', abort, { once: true });
		child.stdout.setEncoding('utf8');
		child.stderr.setEncoding('utf8');
		child.stdout.on('data', (data: string) => {
			bytes += Buffer.byteLength(data);
			if (bytes > (options.maxBytes ?? 4_194_304))
				finish(
					new BridgeError(502, 'output_too_large', 'The CLI response exceeded its size limit.'),
				);
			else stdout += data;
		});
		child.stderr.on('data', (data: string) => {
			if (stderr.length < 16384) stderr += data.slice(0, 16384 - stderr.length);
		});
		child.on('error', () =>
			finish(
				new BridgeError(
					503,
					'cli_unavailable',
					'The selected CLI is not installed or could not start.',
				),
			),
		);
		child.on('close', (code) => finish(undefined, code));
		child.stdin.on('error', () => {});
		child.stdin.end(input);
	});
}

/** CLI diagnostics are classified internally; family content and credentials are never returned. */
export function cliFailure(result: ProcessResult): BridgeError {
	const diagnostic = `${result.stdout}\n${result.stderr}`;
	if (
		/not logged in|authentication|unauthorized|login required|please.*log.?in|invalid.*token|expired.*token|401/i.test(
			diagnostic,
		)
	)
		return new BridgeError(
			401,
			'authentication_required',
			'Sign in to the selected CLI on the server, then try again.',
		);
	if (/usage limit|quota|out of credit|insufficient|limit.*reached/i.test(diagnostic))
		return new BridgeError(
			402,
			'subscription_limit',
			'The CLI account has reached its usage limit.',
		);
	if (/rate.limit|429/i.test(diagnostic))
		return new BridgeError(429, 'rate_limit', 'The CLI account is rate limited. Try again later.');
	return new BridgeError(
		502,
		'cli_failed',
		'The CLI could not complete the request. Check its login and model access on the server.',
	);
}
const ClaudeResult = z.object({
	is_error: z.boolean().optional(),
	result: z.string().optional(),
	structured_output: z.unknown().optional(),
	usage: z
		.object({
			input_tokens: z.number().optional(),
			output_tokens: z.number().optional(),
			cache_creation_input_tokens: z.number().optional(),
			cache_read_input_tokens: z.number().optional(),
		})
		.optional(),
});
const CodexEvent = z.object({
	type: z.string(),
	item: z.object({ type: z.string(), text: z.string().optional() }).passthrough().optional(),
	usage: z
		.object({ input_tokens: z.number().optional(), output_tokens: z.number().optional() })
		.optional(),
});

export function parseResult(backend: Backend, result: ProcessResult): Inference {
	if (result.code !== 0) throw cliFailure(result);
	try {
		if (backend === 'claude') {
			const parsed = ClaudeResult.parse(JSON.parse(result.stdout));
			if (parsed.is_error) throw cliFailure(result);
			const text =
				parsed.structured_output !== undefined
					? JSON.stringify(parsed.structured_output)
					: parsed.result;
			if (!text) throw new Error('Empty');
			return {
				text,
				inputTokens:
					parsed.usage?.input_tokens === undefined
						? undefined
						: parsed.usage.input_tokens +
							(parsed.usage.cache_creation_input_tokens ?? 0) +
							(parsed.usage.cache_read_input_tokens ?? 0),
				outputTokens: parsed.usage?.output_tokens,
			};
		}
		let text = '';
		let usage: Inference = { text: '' };
		let completed = false;
		for (const line of result.stdout.split('\n').filter(Boolean)) {
			const event = CodexEvent.parse(JSON.parse(line));
			if (event.type === 'error' || event.type === 'turn.failed') throw cliFailure(result);
			if (event.type === 'item.completed' && event.item?.type === 'agent_message')
				text = event.item.text ?? '';
			if (event.type === 'turn.completed') {
				completed = true;
				usage = {
					text: '',
					inputTokens: event.usage?.input_tokens,
					outputTokens: event.usage?.output_tokens,
				};
			}
		}
		if (!text || !completed) throw new Error('Incomplete');
		return { ...usage, text };
	} catch (error) {
		if (error instanceof BridgeError) throw error;
		throw new BridgeError(
			502,
			'invalid_output',
			'The CLI returned an incomplete or unreadable response.',
		);
	}
}

export function createRunner(): Runner {
	return {
		async authenticated(backend) {
			try {
				const result = await runProcess(
					backend,
					backend === 'codex' ? ['login', 'status'] : ['auth', 'status'],
					'',
					{ signal: new AbortController().signal, timeoutMs: 10_000, maxBytes: 65536 },
				);
				return result.code === 0;
			} catch {
				return false;
			}
		},
		async infer(backend, model, prepared, options) {
			const cwd = await mkdtemp(join(tmpdir(), 'famos-inference-'));
			try {
				let args: string[];
				if (backend === 'codex') {
					args = [
						'exec',
						'--ignore-user-config',
						'--ignore-rules',
						'--skip-git-repo-check',
						'--ephemeral',
						'--sandbox',
						'read-only',
						'--json',
						'--color',
						'never',
						'-c',
						'approval_policy="never"',
						'-c',
						'web_search="disabled"',
						'-c',
						'features.shell_tool=false',
						'-c',
						'features.code_mode=false',
						'-c',
						'features.code_mode_host=false',
						'-c',
						'features.apps=false',
						'-c',
						'features.image_generation=false',
						'-c',
						'features.computer_use=false',
						'-c',
						'features.browser_use=false',
						'-c',
						'features.hooks=false',
						'-c',
						'features.multi_agent=false',
						'-c',
						'project_doc_max_bytes=0',
					];
					if (model !== 'default') args.push('--model', model);
					if (prepared.schema) {
						const file = join(cwd, 'output-schema.json');
						await writeFile(file, JSON.stringify(prepared.schema), { mode: 0o600 });
						args.push('--output-schema', file);
					}
					args.push('-');
				} else {
					args = [
						'-p',
						'--output-format',
						'json',
						'--tools',
						'',
						'--strict-mcp-config',
						'--mcp-config',
						'{"mcpServers":{}}',
						'--setting-sources',
						'',
						'--disable-slash-commands',
						'--no-session-persistence',
						'--max-turns',
						'3',
						'--system-prompt',
						'Answer the provided FamilyOS conversation. Native tools are disabled.',
					];
					if (model !== 'default') args.push('--model', model);
					if (prepared.schema) args.push('--json-schema', JSON.stringify(prepared.schema));
				}
				return parseResult(
					backend,
					await runProcess(backend, args, prepared.prompt, { ...options, cwd }),
				);
			} finally {
				await rm(cwd, { recursive: true, force: true });
			}
		},
	};
}
