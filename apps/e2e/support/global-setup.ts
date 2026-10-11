import { buildTemplate } from './template.ts';

/** Runs once before the workers start; what it puts in `process.env` reaches every worker. */
export default async function globalSetup() {
	const template = await buildTemplate();
	process.env.FAMOS_E2E_TEMPLATE_ROOT = template.root;
	process.env.FAMOS_E2E_TEMPLATE_DIR = template.dataDir;
	process.env.FAMOS_E2E_TEMPLATE_STATE = template.storageState;
}
