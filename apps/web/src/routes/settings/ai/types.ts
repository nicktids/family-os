import type { paths } from '@famos/api-client';

type Json<P extends keyof paths, M extends keyof paths[P]> = paths[P][M] extends {
	responses: { 200: { content: { 'application/json': infer T } } };
}
	? T
	: never;

export type AiSettings = Json<'/api/v1/ai/settings', 'get'>;
export type Provider = AiSettings['providers'][number];
export type ProviderKind = Provider['kind'];
export type Roles = AiSettings['roles'];
export type Role = keyof Roles;
export type ModelList = Json<'/api/v1/ai/providers/{providerId}/models', 'get'>;
export type Usage = Json<'/api/v1/ai/usage', 'get'>;

export const KINDS: readonly ProviderKind[] = ['openrouter', 'ollama', 'openai-compatible'];
export const ROLES: readonly Role[] = ['smart', 'vision', 'fast', 'transcribe', 'embed'];
/** Roles that take a chat model; "use for all" never copies it onto speech to text or embeddings. */
export const CHAT_ROLES: readonly Role[] = ['smart', 'vision', 'fast'];
export const DEFAULT_URLS: Record<ProviderKind, string> = {
	openrouter: 'https://openrouter.ai/api/v1',
	ollama: 'http://localhost:11434/v1',
	'openai-compatible': '',
};

export type AiArea = Json<'/api/v1/core/ai-areas', 'get'>[number];
export type AiAreaAccess = AiArea['access'];
export const AREA_ACCESS: readonly AiAreaAccess[] = ['off', 'local', 'any'];
export type Activity = Json<'/api/v1/ai/activity', 'get'>;
export type ActivityEntry = Activity['entries'][number];
