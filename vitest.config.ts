import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		projects: [
			'packages/*/vitest.config.ts',
			'extensions/*/vitest.config.ts',
			'apps/*/vitest.config.ts',
			'scripts/vitest.config.ts',
			'tools/*/vitest.config.ts',
		],
	},
});
