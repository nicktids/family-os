import { rm } from 'node:fs/promises';

export default async function globalTeardown() {
	const template = process.env.FAMOS_E2E_TEMPLATE_ROOT;
	if (template) await rm(template, { recursive: true, force: true });
}
