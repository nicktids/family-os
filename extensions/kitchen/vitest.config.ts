import { defineProject } from 'vitest/config';

export default defineProject({ test: { name: 'kitchen', include: ['test/**/*.test.ts'] } });
