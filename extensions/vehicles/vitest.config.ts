import { defineProject } from 'vitest/config';

export default defineProject({ test: { name: 'vehicles', include: ['test/**/*.test.ts'] } });
