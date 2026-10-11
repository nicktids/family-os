// Tools for translators (docs/guide/languages.md):
//   pnpm lang:template <code> [outDir]   writes a fresh pack skeleton from the English catalogs
//   pnpm lang:check <dir> [--complete]   prints coverage and problems of a pack folder
// Run by Node directly (type stripping); no build step.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	canonicalLocale,
	coverage,
	flatten,
	languageName,
	MAX_PACK_BYTES,
	type PackProblem,
	pluralCategories,
	validatePack,
} from '../packages/i18n/src/index.ts';
import { readEnglish, readPackDir } from '../packages/i18n/src/node.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [command, ...args] = process.argv.slice(2);

const ADVICE: Record<PackProblem['kind'], string> = {
	unknown_namespace: 'no such catalog in English; the file is ignored',
	unknown_key: 'no such key in English (renamed or removed?); ignored',
	not_text: 'not a string; ignored',
	placeholders: 'the {{placeholders}} differ from English; this string is dropped',
	too_long: 'longer than 4 KB; this string is dropped',
};

async function template(code: string | undefined, outDir: string | undefined) {
	const canonical = canonicalLocale(code);
	if (!canonical || canonical === 'en') {
		console.error(
			'Usage: pnpm lang:template <code> [dir]   (a BCP 47 code such as de or pt-BR, not en)',
		);
		return 2;
	}
	const dir = resolve(outDir ?? join(root, 'languages', canonical));
	const english = await readEnglish(root);
	try {
		await mkdir(dir);
	} catch {
		console.error(`${dir} exists already. Edit it, or pick another directory.`);
		return 1;
	}
	const manifest = {
		code: canonical,
		name: languageName(canonical),
		nativeName: new Intl.DisplayNames([canonical], { type: 'language' }).of(canonical) ?? canonical,
		version: '0.1.0',
		famos: '>=0.1.0',
		authors: [],
	};
	await writeFile(join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, '\t')}\n`);
	// The English text is the starting value: change each string in place. A string left as English
	// reads fine meanwhile; `pnpm lang:check` counts how many are still identical to English.
	for (const [namespace, catalog] of Object.entries(english)) {
		await writeFile(join(dir, `${namespace}.json`), `${JSON.stringify(catalog, null, '\t')}\n`);
	}
	const forms = pluralCategories(canonical);
	console.log(`Wrote ${dir}`);
	console.log(`Plural forms of ${canonical}: ${forms.join(', ')}.`);
	console.log(
		'Plural strings come as _one and _other (English). Add the others your language needs (for example _few) and drop what it does not.',
	);
	return 0;
}

async function check(dir: string | undefined, complete: boolean) {
	if (!dir) {
		console.error('Usage: pnpm lang:check <dir> [--complete]');
		return 2;
	}
	const english = await readEnglish(root);
	let raw: Awaited<ReturnType<typeof readPackDir>>;
	try {
		raw = await readPackDir(resolve(dir));
	} catch (error) {
		console.error(`Cannot read ${dir}: ${error instanceof Error ? error.message : error}`);
		return 1;
	}
	const result = validatePack(raw, english);
	if (!result.ok) {
		console.error(`Invalid pack: ${result.error}`);
		return 1;
	}
	const { pack, problems } = result;
	const covered = coverage(english, pack);
	const size = new TextEncoder().encode(
		JSON.stringify({ manifest: pack.manifest, catalogs: pack.catalogs }),
	).length;
	console.log(
		`${pack.manifest.nativeName} (${pack.manifest.code}) ${pack.manifest.version}: ${covered.translated} of ${covered.total} strings translated (${Math.floor(covered.ratio * 100)}%), ${(size / 1024).toFixed(0)} KB of ${MAX_PACK_BYTES / 1024 / 1024} MB`,
	);
	// Strings still equal to English: often a translator's placeholder, sometimes a proper name.
	let same = 0;
	for (const [namespace, catalog] of Object.entries(pack.catalogs)) {
		const base = flatten(english[namespace] ?? {});
		for (const [key, text] of flatten(catalog)) if (base.get(key) === text) same++;
	}
	if (same > 0)
		console.log(`Note: ${same} strings are identical to English (fine for names; check the rest).`);
	for (const p of problems) {
		console.log(`  problem  ${p.namespace}${p.key ? `:${p.key}` : ''}  ${ADVICE[p.kind]}`);
	}
	for (const m of covered.missing.slice(0, 20)) console.log(`  missing  ${m.namespace}:${m.key}`);
	if (covered.missing.length > 20)
		console.log(`  … and ${covered.missing.length - 20} more missing`);
	if (problems.length > 0) {
		console.error(`${problems.length} problem(s) found.`);
		return 1;
	}
	if (complete && covered.missing.length > 0) {
		console.error(`${covered.missing.length} string(s) missing and --complete was given.`);
		return 1;
	}
	console.log('OK');
	return 0;
}

async function run(): Promise<number> {
	if (command === 'template') return template(args[0], args[1]);
	if (command === 'check') {
		return check(
			args.find((a) => !a.startsWith('--')),
			args.includes('--complete'),
		);
	}
	console.error('Usage: lang.ts template <code> [dir] | check <dir> [--complete]');
	return 2;
}

process.exit(await run());
