import { defineProject } from 'vitest/config';

export default defineProject({ test: { name: 'time', include: ['test/**/*.test.ts'] } });
