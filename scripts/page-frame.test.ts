import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every page renders inside `<Page template=…>` from @famos/ui: the
 * frame alone decides a page's width and centring, so pages of one width class line up. This scans
 * the app's routes and every extension's web code for a page that sets its own frame: a page-level
 * maximum width (40 rem / 640 px and up, `max-w-4xl` and up), or centring or negative margins on a
 * page's outermost elements. Widths inside a page (a card, an empty state, reading text with
 * `max-w-prose`) are fine.
 *
 * Not scanned: the shell itself (`+layout.svelte`), the kiosk (`/display`, a screen of its own) and
 * the signed-out pages (`/login`, `/setup`), which sit outside the shell.
 */
const root = join(import.meta.dirname, '..');
const SKIP = [/\/\+layout\.svelte$/, /routes\/display\//, /routes\/login\//, /routes\/setup\//];

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
		else if (name.endsWith('.svelte')) yield path;
	}
}

function pageFiles(): string[] {
	const dirs = [
		'apps/web/src/routes',
		...readdirSync(join(root, 'extensions')).map((e) => `extensions/${e}/src/web`),
	];
	return dirs
		.flatMap((dir) => [...walk(join(root, dir))])
		.map((file) => file.slice(root.length + 1))
		.filter((file) => !SKIP.some((re) => re.test(file)));
}

const PAGE_REM = 40;
const rem = (value: string, unit: string) => Number(value) / (unit === 'px' ? 16 : 1);

/** What a page may not write, with why; empty when the text is fine. */
function frameProblems(text: string): string[] {
	const problems: string[] = [];
	const style = /<style[^>]*>([\s\S]*?)<\/style>/g;
	const css = [...text.matchAll(style)].map((m) => m[1]).join('\n');
	const code = text.replace(style, '');

	for (const m of code.matchAll(/max-w-\[([\d.]+)(rem|px)\]/g)) {
		if (rem(m[1], m[2]) >= PAGE_REM) problems.push(`a page width (${m[0]})`);
	}
	for (const m of code.matchAll(/\bmax-w-(?:[4-7]xl|screen(?:-\w+)?)\b/g)) {
		problems.push(`a page width (${m[0]})`);
	}
	for (const m of css.matchAll(/max-width:\s*([\d.]+)(rem|px)/g)) {
		if (rem(m[1], m[2]) >= PAGE_REM) problems.push(`a page width (${m[0]})`);
	}
	for (const m of css.matchAll(/margin[\w-]*:[^;]*?-([\d.]+)(rem|px)/g)) {
		if (rem(m[1], m[2]) >= 1) problems.push(`a negative margin (${m[0].trim()})`);
	}

	// The outermost elements of the markup: a tag at the start of a line, outside the script.
	const markup = code.replace(/<script[^>]*>[\s\S]*?<\/script>/g, '');
	for (const m of markup.matchAll(/^<([a-z][\w-]*)((?:[^>{]|\{[^}]*\})*)>/gm)) {
		const attrs = m[2];
		if (/\bmx-auto\b/.test(attrs)) problems.push(`centring on <${m[1]}> (mx-auto)`);
		const negative = attrs.match(/(?:^|[\s"'{:])-m[xytbse]?-[\w[]+/);
		if (negative) problems.push(`a negative margin on <${m[1]}> (${negative[0].trim()})`);
	}
	return problems;
}

describe('page frame', () => {
	it('lets only <Page> set a page’s width and centring', () => {
		const offenders = pageFiles().flatMap((file) =>
			frameProblems(readFileSync(join(root, file), 'utf8')).map(
				(problem) =>
					`${file} sets its own frame: ${problem}. Use <Page template=…> from @famos/ui/famos.`,
			),
		);
		expect(offenders).toEqual([]);
	});

	it('puts every app page in a frame', () => {
		const missing = pageFiles()
			.filter((file) => file.endsWith('+page.svelte'))
			.filter((file) => {
				const text = readFileSync(join(root, file), 'utf8');
				return !/^<!-- Redirects/.test(text) && !/<(?:Page|PageFrame)\b/.test(text);
			})
			.map((file) => `${file} renders no frame. Use <Page template=…> from @famos/ui/famos.`);
		expect(missing).toEqual([]);
	});

	it('catches the patterns it is looking for', () => {
		expect(frameProblems('<div class="max-w-[72rem]">x</div>')).toHaveLength(1);
		expect(frameProblems(`<div class={wide ? 'max-w-[68rem]' : ''}>x</div>`)).toHaveLength(1);
		expect(frameProblems('<div class="grid max-w-5xl">x</div>')).toHaveLength(1);
		expect(frameProblems('<div class="mx-auto grid w-full">x</div>')).toHaveLength(1);
		expect(frameProblems('<div class="-mx-4 grid">x</div>')).toHaveLength(1);
		expect(frameProblems('<style>.a { max-width: 760px; }</style>')).toHaveLength(1);
		expect(frameProblems('<style>.a { margin: -1.5rem -1rem; }</style>')).toHaveLength(1);
		// Widths and centring inside a page are fine.
		expect(frameProblems('<div>\n\t<div class="mx-auto max-w-[420px]">x</div>\n</div>')).toEqual(
			[],
		);
		expect(frameProblems('<p class="max-w-prose">x</p>')).toEqual([]);
		expect(frameProblems('<style>.a { max-width: 34ch; margin: -2px; }</style>')).toEqual([]);
	});
});
