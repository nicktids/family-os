import { defineProject } from 'vitest/config';

export default defineProject({ test: { name: 'records', include: ['test/**/*.test.ts'] } });
