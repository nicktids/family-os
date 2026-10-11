import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Dates, times and numbers follow the family's format locale, never the UI language.
 * This scans the web app and extension UIs for the UI language handed to a formatter.
 */
const root = join(import.meta.dirname, '..');
const dirs = ['apps/web/src', 'packages/ui/src', ...extensionDirs()];

function extensionDirs(): string[] {
	return readdirSync(join(root, 'extensions')).map((e) => `extensions/${e}/src`);
}

function* walk(dir: string): Generator<string> {
	let entries: string[];
	try {
		entries = readdirSync(dir);
	} catch {
		return;
	}
	for (const name of entries) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) yield* walk(path);
		else if (/\.(ts|svelte)$/.test(name)) yield path;
	}
}

// The UI language: `app.locale()` in extensions, `getLocale()` in the app.
const LANGUAGE = String.raw`(?:app\.locale\(\)|getLocale\(\)|locale\(\))`;
const FORBIDDEN = [
	new RegExp(
		String.raw`Intl\.(?:DateTimeFormat|NumberFormat|ListFormat|PluralRules)\(\s*${LANGUAGE}`,
	),
	new RegExp(String.raw`\.toLocale\w*String\(\s*${LANGUAGE}`),
	new RegExp(
		String.raw`\b(?:formatDate|formatMinor|formatInput|parseAmount|timeLabel|weekdayNames)\([^)]*${LANGUAGE}`,
	),
];

describe('region formats', () => {
	it('never format dates, times or numbers with the UI language', () => {
		const offenders: string[] = [];
		for (const dir of dirs) {
			for (const file of walk(join(root, dir))) {
				const text = readFileSync(file, 'utf8');
				for (const re of FORBIDDEN) {
					if (re.test(text)) offenders.push(`${file.slice(root.length + 1)} matches ${re.source}`);
				}
			}
		}
		expect(offenders).toEqual([]);
	});

	it('catches the patterns it is looking for', () => {
		expect(FORBIDDEN.some((re) => re.test('new Intl.DateTimeFormat(app.locale(), {})'))).toBe(true);
		expect(FORBIDDEN.some((re) => re.test('new Intl.NumberFormat(getLocale())'))).toBe(true);
		expect(FORBIDDEN.some((re) => re.test('formatDate(day, app.locale())'))).toBe(true);
		expect(FORBIDDEN.some((re) => re.test('new Intl.DateTimeFormat(app.formatLocale(), {})'))).toBe(
			false,
		);
	});
});
