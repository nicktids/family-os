import { randomBytes } from 'node:crypto';
import {
	aiMigrations,
	createAiSdkLlm,
	createAiSettings,
	createSecretBox,
	type ProviderKind,
	ProviderKindSchema,
	type UsageSummary,
} from '@famos/adapters/llm-aisdk';
import { silentLogger, uuidv7Ids } from '@famos/adapters/runtime';
import { openDatabase, runMigrations } from '@famos/db';
import type { LlmPort } from '@famos/sdk';

export interface EnvLlm {
	llm: LlmPort;
	/** `provider / model`, for reports. */
	label: string;
	usage(): Promise<UsageSummary>;
}

/**
 * A real model for evaluations (never for tests), configured from the environment:
 * `FAMOS_EVAL_API_KEY`, `FAMOS_EVAL_MODEL` (default google/gemini-2.5-flash),
 * `FAMOS_EVAL_PROVIDER` (default openrouter) and `FAMOS_EVAL_BASE_URL`. Returns null when no
 * key or address is set. The key stays in memory.
 */
export async function llmFromEnv(env: NodeJS.ProcessEnv = process.env): Promise<EnvLlm | null> {
	const kind: ProviderKind = ProviderKindSchema.parse(env.FAMOS_EVAL_PROVIDER ?? 'openrouter');
	const apiKey = env.FAMOS_EVAL_API_KEY;
	const baseUrl = env.FAMOS_EVAL_BASE_URL;
	if (!apiKey && !baseUrl) return null;
	const model = env.FAMOS_EVAL_MODEL ?? 'google/gemini-2.5-flash';
	const { db } = openDatabase({ path: ':memory:' });
	await runMigrations(db, [{ scope: 'ai', migrations: aiMigrations }]);
	const clock = { now: () => Date.now() };
	const timeZone = async () => 'UTC';
	const settings = createAiSettings({
		db,
		box: createSecretBox(randomBytes(32).toString('hex')),
		clock,
		ids: uuidv7Ids,
		timeZone,
	});
	await settings.syncFromEnvironment({
		name: kind,
		kind,
		...(baseUrl && { baseUrl }),
		...(apiKey && { apiKey }),
		models: { fast: model, vision: model, smart: model },
	});
	const llm = createAiSdkLlm({
		db,
		settings,
		clock,
		ids: uuidv7Ids,
		logger: silentLogger,
		timeZone,
		areaAccess: () => 'any',
	});
	return { llm, label: `${kind} / ${model}`, usage: () => settings.usage() };
}
