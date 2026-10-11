import { defineProject } from 'vitest/config';

export default defineProject({ test: { name: 'pets', include: ['test/**/*.test.ts'] } });
