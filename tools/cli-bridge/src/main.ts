import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { createRunner } from './runner.ts';
import { createBridge } from './server.ts';

const env = z
	.object({
		FAMOS_CLI_KEY_FILE: z.string().default('/run/secrets/cli_bridge_key'),
		PORT: z.coerce.number().int().min(1).max(65535).default(8787),
		CODEX_MODELS: z.string().default('default'),
		CLAUDE_MODELS: z.string().default('default'),
		FAMOS_CLI_TIMEOUT_MS: z.coerce.number().int().min(100).max(600_000).default(120_000),
		FAMOS_CLI_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(2),
	})
	.parse(process.env);
const models = [
	...env.CODEX_MODELS.split(',')
		.filter(Boolean)
		.map((m) => `codex/${m.trim()}`),
	...env.CLAUDE_MODELS.split(',')
		.filter(Boolean)
		.map((m) => `claude/${m.trim()}`),
];
const key = (await readFile(env.FAMOS_CLI_KEY_FILE, 'utf8')).trim();
const server = createBridge(
	{ key, models, timeoutMs: env.FAMOS_CLI_TIMEOUT_MS, concurrency: env.FAMOS_CLI_CONCURRENCY },
	createRunner(),
);
server.listen(env.PORT, '0.0.0.0', () =>
	console.info(`FamilyOS CLI bridge listening on ${env.PORT}`),
);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
	process.on(signal, () => server.close(() => process.exit(0)));
