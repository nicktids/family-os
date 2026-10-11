import { defineProject } from 'vitest/config';

export default defineProject({ test: { name: 'ambient', include: ['test/**/*.test.ts'] } });
