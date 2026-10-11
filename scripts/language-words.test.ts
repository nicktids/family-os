import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/**
 * Code is written in English, and the words of every other language come from
 * language packs. A word of another language in a string or a regular expression (a command
 * name, a weekday, a unit) means a new language pack can never work there. This scans the
 * strings, templates and regular expressions of the source (not the comments) for letters
 * outside ASCII.
 */
const root = join(import.meta.dirname, '..');
const dirs = [
	'apps/server/src',
	'apps/web/src',
	...readdirSync(join(root, 'packages')).map((p) => `packages/${p}/src`),
	...readdirSync(join(root, 'extensions')).map((e) => `extensions/${e}/src`),
];

/** Places where a non-ASCII letter is not a word of a language. Each says why. */
const ALLOWED: { file: string; text: string; why: string }[] = [
	{
		file: 'extensions/calendar/src/contract/index.ts',
		text: 'ı',
		why: 'Unicode case folding: dotless i has no decomposition, so it is folded to i by hand',
	},
	{
		file: 'extensions/calendar/src/server/store.ts',
		text: 'ı',
		why: 'Unicode case folding, as above',
	},
	{ file: 'packages/core/src/themes.ts', text: 'Ev Işığı', why: 'the name of the default theme' },
];

const isLetter = (ch: string) => /\p{L}/u.test(ch) && (ch.codePointAt(0) ?? 0) > 127;

function* walk(dir: string): Generator<string> {
	let entries: string[];
	try {
		entries = readdirSync(dir);
	} catch {
		return;
	}
	for (const name of entries) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) {
			if (name !== 'generated' && name !== 'node_modules') yield* walk(path);
		} else if (/\.(ts|svelte)$/.test(name) && !/\.test\.ts$/.test(name)) yield path;
	}
}

/** The script parts of a file (a Svelte file's `<script>` blocks, a TypeScript file whole). */
function scripts(file: string, text: string): string[] {
	if (!file.endsWith('.svelte')) return [text];
	return [...text.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1] ?? '');
}

/** Strings, template parts and regular expressions of a script (not its comments). */
function literals(source: string): string[] {
	const found: string[] = [];
	const scanner = ts.createScanner(
		ts.ScriptTarget.Latest,
		true,
		ts.LanguageVariant.Standard,
		source,
	);
	let previous = ts.SyntaxKind.Unknown;
	/** Open braces inside each `${…}` of the templates being read. */
	const open: number[] = [];
	for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) {
		// A slash where an expression may start begins a regular expression.
		if (
			(kind === ts.SyntaxKind.SlashToken || kind === ts.SyntaxKind.SlashEqualsToken) &&
			![
				ts.SyntaxKind.Identifier,
				ts.SyntaxKind.CloseParenToken,
				ts.SyntaxKind.CloseBracketToken,
				ts.SyntaxKind.NumericLiteral,
				ts.SyntaxKind.StringLiteral,
			].includes(previous)
		)
			kind = scanner.reScanSlashToken();
		// Inside `${…}` braces are counted; the `}` that closes it continues the template.
		if (kind === ts.SyntaxKind.OpenBraceToken && open.length) open[open.length - 1]++;
		else if (kind === ts.SyntaxKind.CloseBraceToken && open.length) {
			if (open[open.length - 1] === 0) {
				kind = scanner.reScanTemplateToken(false);
				if (kind === ts.SyntaxKind.TemplateTail) open.pop();
			} else open[open.length - 1]--;
		}
		if (kind === ts.SyntaxKind.TemplateHead) open.push(0);
		if (
			kind === ts.SyntaxKind.StringLiteral ||
			kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral ||
			kind === ts.SyntaxKind.TemplateHead ||
			kind === ts.SyntaxKind.TemplateMiddle ||
			kind === ts.SyntaxKind.TemplateTail ||
			kind === ts.SyntaxKind.RegularExpressionLiteral
		)
			found.push(scanner.getTokenText());
		previous = kind;
	}
	return found;
}

describe('language words', () => {
	it('keep words of other languages out of the code (they belong in language packs)', () => {
		const offenders: string[] = [];
		for (const dir of dirs) {
			for (const file of walk(join(root, dir))) {
				const rel = file.slice(root.length + 1);
				const text = readFileSync(file, 'utf8');
				for (const script of scripts(file, text)) {
					for (const literal of literals(script)) {
						if (![...literal].some(isLetter)) continue;
						if (ALLOWED.some((a) => a.file === rel && literal.includes(a.text))) continue;
						offenders.push(`${rel}: ${literal.slice(0, 80)}`);
					}
				}
			}
		}
		expect(offenders).toEqual([]);
		// It reads every source file of the repository: well under a second alone, but past the
		// 5 s default when the whole suite runs on a loaded machine.
	}, 30_000);

	it('finds words in strings and regular expressions, not in comments', () => {
		const has = (source: string) => literals(source).some((l) => [...l].some(isLetter));
		expect(has('const command = /^\\/(?:paylaş|share)/;')).toBe(true);
		expect(has("const unit = 'şişe';")).toBe(true);
		// A template literal in the scanned source (split so it is not a placeholder here).
		expect(has('const day = `bugün $' + '{x} yarın`;')).toBe(true);
		expect(has('// Türkçe yorum\nconst a = 1 / 2; /* çok */')).toBe(false);
		expect(has("const ok = 'plain English';")).toBe(false);
	});
});
