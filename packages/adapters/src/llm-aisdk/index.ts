export { createSecretBox, type SecretBox } from './crypto.ts';
export {
	createAiSdkLlm,
	type EmbeddingFactory,
	type ModelFactory,
	openAiCompatibleEmbedder,
	openAiCompatibleModel,
} from './llm.ts';
export * from './schemas.ts';
export {
	type AiSettingsService,
	createAiSettings,
	monthBounds,
	type ResolvedProvider,
} from './settings.ts';
export { type AiTables, aiMigrations, aiTables } from './tables.ts';

// The AI SDK prints provider warnings to the console; FamilyOS reports failures through its logger.
globalThis.AI_SDK_LOG_WARNINGS = false;
