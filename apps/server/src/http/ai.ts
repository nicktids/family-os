import {
	AiActivityEntrySchema,
	AiSettingsSchema,
	type AiSettingsService,
	LimitsSchema,
	ModelListSchema,
	PrivacySchema,
	ProviderInputSchema,
	ProviderPatchSchema,
	ProviderSchema,
	RolesSchema,
	SwitchesSchema,
	UsageSummarySchema,
} from '@famos/adapters/llm-aisdk';
import { CORE_CAPABILITIES } from '@famos/core';
import { type AccessControl, type FamilyReader, FamosError } from '@famos/sdk';
import { createRoute, type OpenAPIHono, z } from '@hono/zod-openapi';
import type { Context } from 'hono';
import type { AppEnv } from './env.ts';
import { errorResponses } from './errors.ts';

/**
 * AI settings for admins. These routes handle provider credentials, so like password
 * and device routes they call the adapter directly instead of going through actions. Nothing
 * here runs a model: the connection test only lists models.
 */
const json = (schema: z.ZodType) => ({ content: { 'application/json': { schema } } });
const body = <S extends z.ZodType>(schema: S) => ({
	body: { content: { 'application/json': { schema } }, required: true as const },
});
const ProviderParams = z.object({ providerId: z.string() });
const base = { tags: ['ai'], security: [{ session: [] }] };

function requireAiManager(c: Context<AppEnv>, access: AccessControl) {
	const actor = c.get('actor');
	if (!actor) throw new FamosError('unauthenticated', 'Sign in required');
	if (!access.can(actor, CORE_CAPABILITIES.aiManage.id))
		throw new FamosError('forbidden', 'Not allowed to manage AI settings');
}

export function mountAiRoutes(
	app: OpenAPIHono<AppEnv>,
	ai: AiSettingsService,
	access: AccessControl,
	family: FamilyReader,
	/** The models or providers changed: family search brings its index in line. */
	onModelsChanged: () => Promise<void>,
): void {
	const requireAdmin = (c: Context<AppEnv>) => requireAiManager(c, access);
	const getSettings = createRoute({
		...base,
		method: 'get',
		path: '/api/v1/ai/settings',
		operationId: 'ai.getSettings',
		summary: 'Providers (without keys), role → model mapping and monthly limits',
		responses: {
			200: { description: 'AI settings', ...json(AiSettingsSchema) },
			...errorResponses,
		},
	});
	app.openapi(getSettings, async (c) => {
		requireAdmin(c);
		return c.json(await ai.get(), 200);
	});

	const createProvider = createRoute({
		...base,
		method: 'post',
		path: '/api/v1/ai/providers',
		operationId: 'ai.createProvider',
		summary: 'Add a provider; the API key is stored encrypted and never returned',
		request: body(ProviderInputSchema),
		responses: {
			201: { description: 'Provider added', ...json(ProviderSchema) },
			...errorResponses,
		},
	});
	app.openapi(createProvider, async (c) => {
		requireAdmin(c);
		return c.json(await ai.createProvider(c.req.valid('json')), 201);
	});

	const updateProvider = createRoute({
		...base,
		method: 'patch',
		path: '/api/v1/ai/providers/{providerId}',
		operationId: 'ai.updateProvider',
		summary: 'Rename a provider, change its address, or replace or remove its key',
		request: { params: ProviderParams, ...body(ProviderPatchSchema) },
		responses: {
			200: { description: 'Provider updated', ...json(ProviderSchema) },
			...errorResponses,
		},
	});
	app.openapi(updateProvider, async (c) => {
		requireAdmin(c);
		const provider = await ai.updateProvider(c.req.valid('param').providerId, c.req.valid('json'));
		await onModelsChanged();
		return c.json(provider, 200);
	});

	const deleteProvider = createRoute({
		...base,
		method: 'delete',
		path: '/api/v1/ai/providers/{providerId}',
		operationId: 'ai.deleteProvider',
		summary: 'Remove a provider; roles that used it become unset',
		request: { params: ProviderParams },
		responses: {
			200: { description: 'Removed', ...json(z.object({ ok: z.literal(true) })) },
			...errorResponses,
		},
	});
	app.openapi(deleteProvider, async (c) => {
		requireAdmin(c);
		await ai.deleteProvider(c.req.valid('param').providerId);
		await onModelsChanged();
		return c.json({ ok: true as const }, 200);
	});

	const listModels = createRoute({
		...base,
		method: 'get',
		path: '/api/v1/ai/providers/{providerId}/models',
		operationId: 'ai.listModels',
		summary: "Test the connection by listing the provider's models",
		request: { params: ProviderParams },
		responses: {
			200: { description: 'Models, or why the connection failed', ...json(ModelListSchema) },
			...errorResponses,
		},
	});
	app.openapi(listModels, async (c) => {
		requireAdmin(c);
		return c.json(await ai.listModels(c.req.valid('param').providerId), 200);
	});

	const setRoles = createRoute({
		...base,
		method: 'put',
		path: '/api/v1/ai/roles',
		operationId: 'ai.setRoles',
		summary: 'Choose the model for each role',
		request: body(RolesSchema),
		responses: { 200: { description: 'Roles saved', ...json(RolesSchema) }, ...errorResponses },
	});
	app.openapi(setRoles, async (c) => {
		requireAdmin(c);
		const roles = await ai.setRoles(c.req.valid('json'));
		await onModelsChanged();
		return c.json(roles, 200);
	});

	const setLimits = createRoute({
		...base,
		method: 'put',
		path: '/api/v1/ai/limits',
		operationId: 'ai.setLimits',
		summary: 'Set the monthly budget and call limit',
		request: body(LimitsSchema),
		responses: { 200: { description: 'Limits saved', ...json(LimitsSchema) }, ...errorResponses },
	});
	app.openapi(setLimits, async (c) => {
		requireAdmin(c);
		return c.json(await ai.setLimits(c.req.valid('json')), 200);
	});

	const setPrivacy = createRoute({
		...base,
		method: 'put',
		path: '/api/v1/ai/privacy',
		operationId: 'ai.setPrivacy',
		summary: 'Set what the AI may see and how providers must treat it',
		request: body(PrivacySchema),
		responses: {
			200: { description: 'Privacy saved', ...json(PrivacySchema) },
			...errorResponses,
		},
	});
	app.openapi(setPrivacy, async (c) => {
		requireAdmin(c);
		return c.json(await ai.setPrivacy(c.req.valid('json')), 200);
	});

	const setSwitches = createRoute({
		...base,
		method: 'put',
		path: '/api/v1/ai/switches',
		operationId: 'ai.setSwitches',
		summary: 'Turn AI, or single AI features, on or off',
		request: body(SwitchesSchema),
		responses: {
			200: { description: 'Switches saved', ...json(SwitchesSchema) },
			...errorResponses,
		},
	});
	app.openapi(setSwitches, async (c) => {
		requireAdmin(c);
		return c.json(await ai.setSwitches(c.req.valid('json')), 200);
	});

	const usage = createRoute({
		...base,
		method: 'get',
		path: '/api/v1/ai/usage',
		operationId: 'ai.getUsage',
		summary: "This month's model calls, tokens and cost, by feature and model",
		responses: {
			200: { description: 'Usage summary', ...json(UsageSummarySchema) },
			...errorResponses,
		},
	});
	app.openapi(usage, async (c) => {
		requireAdmin(c);
		return c.json(await ai.usage(), 200);
	});

	const ActivityQuery = z.object({
		limit: z.coerce.number().int().min(1).max(200).optional(),
		before: z.string().max(100).optional(),
	});
	const ActivitySchema = z.object({
		entries: z.array(
			AiActivityEntrySchema.omit({ memberId: true }).extend({
				/** Who the work was for; null for background work or someone no longer in the family. */
				member: z.string().nullable(),
			}),
		),
		/** Pass as `before` to get the next, older page; null at the end. */
		next: z.string().nullable(),
	});
	const activity = createRoute({
		...base,
		method: 'get',
		path: '/api/v1/ai/activity',
		operationId: 'ai.getActivity',
		summary: 'Every model call, newest first: when, which feature, which areas, cost and result',
		request: { query: ActivityQuery },
		responses: {
			200: {
				description: 'A page of AI activity (no prompts or answers)',
				...json(ActivitySchema),
			},
			...errorResponses,
		},
	});
	app.openapi(activity, async (c) => {
		requireAdmin(c);
		const { limit, before } = c.req.valid('query');
		const page = await ai.activity({
			...(limit !== undefined && { limit }),
			...(before !== undefined && { before }),
		});
		const names = new Map((await family.members()).map((m) => [m.id as string, m.displayName]));
		return c.json(
			{
				entries: page.entries.map(({ memberId, ...entry }) => ({
					...entry,
					member: memberId ? (names.get(memberId) ?? null) : null,
				})),
				next: page.next,
			},
			200,
		);
	});
}
