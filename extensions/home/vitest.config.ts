import { defineProject } from 'vitest/config';

export default defineProject({ test: { name: 'home', include: ['test/**/*.test.ts'] } });
