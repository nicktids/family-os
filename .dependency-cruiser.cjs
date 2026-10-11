/**
 * Architecture rules, enforced in CI (`pnpm lint`).
 * A violation means the layering is broken; fix the import, don't relax the rule.
 */
const INFRA_LIBS =
	'node_modules/(hono|@hono|better-auth|@better-auth|better-sqlite3|ai|@ai-sdk|ws|tar)/';

module.exports = {
	forbidden: [
		{
			name: 'sdk-is-dependency-free',
			comment: '@famos/sdk may only depend on zod and kysely types.',
			severity: 'error',
			from: { path: '^packages/sdk/src' },
			to: { path: '^(packages|apps|extensions)/', pathNot: '^packages/sdk/' },
		},
		{
			name: 'sdk-no-node-builtins',
			severity: 'error',
			from: { path: '^packages/sdk/src' },
			to: { dependencyTypes: ['core'] },
		},
		{
			name: 'core-only-sdk',
			comment: 'Core depends on the SDK, never on db, adapters or apps.',
			severity: 'error',
			from: { path: '^packages/core/src' },
			to: { path: '^(packages/(db|adapters|testing|ui|api-client)|apps|extensions)/' },
		},
		{
			name: 'core-no-infra-libs',
			severity: 'error',
			from: { path: '^packages/core/src' },
			to: { path: INFRA_LIBS },
		},
		{
			name: 'core-no-node-builtins',
			comment: 'Core runs on any JS runtime; platform access goes through ports.',
			severity: 'error',
			from: { path: '^packages/core/src' },
			to: { dependencyTypes: ['core'] },
		},
		{
			name: 'extensions-only-sdk-ui-contracts',
			comment:
				"Extensions import only the SDK, UI, time, i18n, the API client (web only) and other extensions' ./contract.",
			severity: 'error',
			from: { path: '^extensions/([^/]+)/src' },
			to: {
				path: '^(packages/(core|db|adapters|testing)|apps)/',
			},
		},
		{
			name: 'extension-api-client-only-in-web',
			comment: "Only an extension's ./web code may call the API, through the generated client.",
			severity: 'error',
			from: { path: '^extensions/[^/]+/src/(server|contract)' },
			to: { path: '^packages/api-client/' },
		},
		{
			name: 'extensions-no-internals-of-others',
			severity: 'error',
			from: { path: '^extensions/([^/]+)/src' },
			to: {
				path: '^extensions/([^/]+)/src',
				pathNot: ['^extensions/$1/src', '^extensions/[^/]+/src/contract'],
			},
		},
		{
			name: 'extensions-no-infra-libs',
			severity: 'error',
			from: { path: '^extensions/[^/]+/src' },
			to: { path: INFRA_LIBS },
		},
		{
			name: 'only-server-wires-infrastructure',
			comment: 'Only the composition root (apps/server) imports db and adapters.',
			severity: 'error',
			from: {
				path: '^(packages|extensions|apps/web)/',
				pathNot: '^packages/(db|adapters|testing)/|^packages/core/test/',
			},
			to: { path: '^packages/(db|adapters)/' },
		},
		{
			name: 'web-no-server-code',
			severity: 'error',
			from: { path: '^apps/web/' },
			to: {
				path: [
					'^apps/server/',
					'^packages/(core|db|adapters|testing)/',
					'^extensions/[^/]+/src/server',
				],
			},
		},
		{
			name: 'no-unresolvable',
			comment: 'Every import must resolve (catches imports of undeclared dependencies).',
			severity: 'error',
			from: { pathNot: '\\.svelte$' },
			to: { couldNotResolve: true, pathNot: '^\\$(app|env|lib)|^#lib|^virtual:' },
		},
		{
			name: 'no-circular',
			severity: 'error',
			from: {},
			to: { circular: true },
		},
	],
	options: {
		doNotFollow: { path: 'node_modules' },
		exclude: { path: '(^|/)(node_modules|dist|build|\\.svelte-kit|generated)/' },
		tsPreCompilationDeps: true,
		tsConfig: { fileName: 'tsconfig.base.json' },
		enhancedResolveOptions: {
			exportsFields: ['exports'],
			conditionNames: ['import', 'types', 'default'],
			extensions: ['.ts', '.js', '.svelte'],
		},
	},
};
