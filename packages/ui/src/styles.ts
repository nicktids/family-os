/**
 * Styles: how Today and the family display are arranged, with their type ramp and
 * default fonts. A style is code the app ships, never part of a theme pack; the palette (a
 * theme pack) is chosen separately and works with every style.
 *
 * The ids are the same as core's `STYLE_IDS` (the web app checks the two agree at compile time
 * against the API's types). The style in use is set on the document as `data-style` before
 * first paint; its type ramp (`styles.css`) is a set of custom properties under that attribute.
 */

/** A font slot: a theme pack may fill `display` and `serif`; `body` is its `font`. */
export type FontSlot = 'display' | 'serif' | 'body';

export interface StyleDefinition {
	id: string;
	/** Key in the app's catalog for the style's name. */
	nameKey: string;
	/**
	 * The family each font slot uses when the theme leaves it empty (a font the app bundles).
	 * `null`: the style does not use that voice and the slot falls back to the body font.
	 */
	fonts: Record<FontSlot, string | null>;
}

export const STYLES = {
	broadsheet: {
		id: 'broadsheet',
		nameKey: 'style_broadsheet',
		fonts: { display: 'Barlow Condensed', serif: 'Instrument Serif', body: 'Figtree' },
	},
	lanes: {
		id: 'lanes',
		nameKey: 'style_lanes',
		fonts: { display: 'Archivo', serif: null, body: 'Figtree' },
	},
	wall: {
		id: 'wall',
		nameKey: 'style_wall',
		fonts: { display: 'Figtree', serif: 'Figtree', body: 'Figtree' },
	},
} as const satisfies Record<string, StyleDefinition>;

export type StyleId = keyof typeof STYLES;

/** In the order they are offered. */
export const STYLE_IDS = Object.keys(STYLES) as StyleId[];

/** The style everything falls back to. */
export const DEFAULT_STYLE: StyleId = 'broadsheet';

export const isStyleId = (id: unknown): id is StyleId =>
	typeof id === 'string' && Object.hasOwn(STYLES, id);
