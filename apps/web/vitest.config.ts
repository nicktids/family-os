import { defineProject } from 'vitest/config';

// Plain TypeScript modules of the app only (no Svelte, no browser): see src/lib/offline-queue.ts.
export default defineProject({ test: { name: 'web', include: ['src/**/*.test.ts'] } });
