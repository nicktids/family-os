import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_STYLE, isStyleId, STYLE_IDS, STYLES } from '../src/styles.ts';

const css = readFileSync(join(import.meta.dirname, '../src/styles.css'), 'utf8');

/** The custom properties declared under `[data-style="<id>"]`. */
function ramp(id: string): string[] {
	const block = new RegExp(`\\[data-style="${id}"\\]\\s*\\{([^}]*)\\}`).exec(css);
	if (!block?.[1]) return [];
	return [...block[1].matchAll(/(--[a-z-]+)\s*:/g)].map((m) => m[1] as string).sort();
}

describe('the style registry', () => {
	it('offers Broadsheet, Lanes and Wall, Broadsheet by default', () => {
		expect(STYLE_IDS).toEqual(['broadsheet', 'lanes', 'wall']);
		expect(DEFAULT_STYLE).toBe('broadsheet');
		for (const id of STYLE_IDS) {
			expect(STYLES[id].id).toBe(id);
			expect(STYLES[id].nameKey).toBe(`style_${id}`);
		}
		expect(isStyleId('wall')).toBe(true);
		expect(isStyleId('mosaic')).toBe(false);
		expect(isStyleId('toString')).toBe(false);
	});

	it('gives every style the same ramp, under its own data-style', () => {
		const expected = ramp(DEFAULT_STYLE);
		expect(expected).toContain('--ramp-clock');
		expect(expected).toContain('--style-font-display');
		for (const id of STYLE_IDS) expect(ramp(id), id).toEqual(expected);
		// Nothing outside the three styles: the ramp never leaks onto the page without a style.
		const selectors = [...css.matchAll(/^([^\s/*}][^{}]*)\{/gm)].map((m) => m[1]?.trim());
		expect(selectors).toEqual(STYLE_IDS.map((id) => `[data-style="${id}"]`));
	});
});
