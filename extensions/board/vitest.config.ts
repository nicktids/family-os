import { defineProject } from 'vitest/config';

export default defineProject({ test: { name: 'board', include: ['test/**/*.test.ts'] } });
