import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * English is the only language the code knows. Every other language is a pack under
 * `languages/`, found through the registry, so no code may branch on a language name or list
 * languages in an enum. Scans application sources (not tests, not `languages/`).
 */
const root = join(import.meta.dirname, '..');
const dirs = ['apps', 'packages', 'extensions'];
const SKIP_DIRS = new Set([
	'node_modules',
	'dist',
	'build',
	'.svelte-kit',
	'.turbo',
	'.vitest',
	'generated',
	'test',
	'tests',
	'test-results',
	'playwright-report',
]);

function* walk(dir: string): Generator<string> {
	let entries: string[];
	try {
		entries = readdirSync(dir);
	} catch {
		return;
	}
	for (const name of entries) {
		if (SKIP_DIRS.has(name)) continue;
		const path = join(dir, name);
		if (statSync(path).isDirectory()) yield* walk(path);
		else if (/\.(ts|svelte|mjs)$/.test(name) && !/\.(test|spec)\.ts$/.test(name)) yield path;
	}
}

const FORBIDDEN: { re: RegExp; why: string }[] = [
	{ re: /===?\s*'tr'/, why: "compares a language with 'tr'" },
	{ re: /'tr'\s*===?/, why: "compares a language with 'tr'" },
	{ re: /'tr'\s*\?/, why: "branches on 'tr'" },
	{ re: /\[\s*'en'\s*,\s*'tr'\s*\]/, why: 'lists languages' },
	{ re: /z\.enum\(\s*\[\s*'en'/, why: 'a language enum' },
	{ re: /'en'\s*\|\s*'tr'/, why: 'a language union type' },
];

describe('no language branches in code', () => {
	it('names no language outside tests and languages/', () => {
		const offenders: string[] = [];
		for (const dir of dirs) {
			for (const file of walk(join(root, dir))) {
				const text = readFileSync(file, 'utf8');
				for (const { re, why } of FORBIDDEN) {
					const match = re.exec(text);
					if (match) offenders.push(`${file.slice(root.length + 1)}: ${why} (${match[0]})`);
				}
			}
		}
		expect(offenders).toEqual([]);
	});

	it('catches the patterns it is looking for', () => {
		const hits = (source: string) => FORBIDDEN.some(({ re }) => re.test(source));
		expect(hits("if (locale === 'tr') {}")).toBe(true);
		expect(hits("const x = lang === 'tr' ? 'a' : 'b'")).toBe(true);
		expect(hits("const l = locale === 'tr' ? 'tr' : 'en'")).toBe(true);
		expect(hits("const LOCALES = ['en', 'tr']")).toBe(true);
		expect(hits("z.enum(['en', 'tr'])")).toBe(true);
		expect(hits("locale: 'en' | 'tr'")).toBe(true);
		expect(hits('const region = formatLocale(locale)')).toBe(false);
		expect(hits("sort((a, b) => a.localeCompare(b, 'en'))")).toBe(false);
	});
});
