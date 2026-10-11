import { defineProject } from 'vitest/config';

export default defineProject({ test: { name: 'chores', include: ['test/**/*.test.ts'] } });
