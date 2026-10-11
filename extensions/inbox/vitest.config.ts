import { defineProject } from 'vitest/config';

export default defineProject({ test: { name: 'inbox', include: ['test/**/*.test.ts'] } });
