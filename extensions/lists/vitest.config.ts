import { defineProject } from 'vitest/config';

export default defineProject({ test: { name: 'lists', include: ['test/**/*.test.ts'] } });
