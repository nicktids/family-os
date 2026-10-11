// Tool for theme authors (docs/guide/appearance.md):
//   pnpm theme:check <dir>   validates a theme pack folder and prints what is wrong
// A pack that leaves tokens out inherits them from the bundled Ev Işığı pack, as it does when
// installed. The bundled packs pass the same contrast check.
// Run by Node directly (type stripping); no build step.
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	MAX_PACK_BYTES,
	type ThemeTokens,
	validateThemePack,
} from '../packages/themes/src/index.ts';
import { readThemeDirSync } from '../packages/themes/src/node.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));

function check(): number {
	if (!dir) {
		console.error('Usage: pnpm theme:check <dir>');
		return 2;
	}
	let raw: ReturnType<typeof readThemeDirSync>;
	try {
		raw = readThemeDirSync(resolve(dir));
	} catch (error) {
		console.error(
			`Cannot read ${dir} (a folder with manifest.json and tokens.json): ${error instanceof Error ? error.message : error}`,
		);
		return 1;
	}
	const isDefault = (raw.manifest as { id?: unknown } | null)?.id === 'ev-isigi';
	let fallback: ThemeTokens | undefined;
	if (!isDefault) {
		const base = validateThemePack(readThemeDirSync(join(root, 'themes/ev-isigi')));
		if (!base.ok) {
			console.error('The bundled Ev Işığı pack is invalid; fix it first.');
			return 1;
		}
		fallback = base.pack.tokens;
	}
	const result = validateThemePack(raw, { fallback });
	if (!result.ok) {
		console.error(
			`Invalid pack (${result.errors.length} problem${result.errors.length === 1 ? '' : 's'}):`,
		);
		for (const error of result.errors) console.error(`  error    ${error}`);
		return 1;
	}
	const { manifest, fonts } = result.pack;
	const size =
		Object.values(fonts).reduce((sum, f) => sum + f.length, 0) +
		JSON.stringify([raw.manifest, raw.tokens]).length;
	console.log(
		`${manifest.name} (${manifest.id}) ${manifest.version}: ${Object.keys(fonts).length} font file(s), ${(size / 1024).toFixed(0)} KB of ${MAX_PACK_BYTES / 1024 / 1024} MB`,
	);
	for (const warning of result.warnings) console.log(`  warning  ${warning}`);
	console.log('OK');
	return 0;
}

process.exit(check());
