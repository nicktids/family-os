/**
 * The theme contract: the one list of tokens a theme pack may set. Everything else
 * derives from it: validation, the generated stylesheet, the guide's token table and the test
 * that keeps `packages/ui/src/theme.css` and the bundled Ev Işığı pack in step. Adding a token
 * needs a default in `themes/ev-isigi/tokens.json` and an entry here; removing one is a
 * breaking change for packs.
 */

export type TokenKind = 'color' | 'shadow';

export interface TokenInfo {
	kind: TokenKind;
	/** A color that may carry transparency (a scrim, a shadow's color); the others must be opaque. */
	alpha?: boolean;
	/** What the token is for, in the words the guide uses. */
	meaning: string;
}

/** Tokens a pack sets separately for the day and the night palette. */
export const MODE_TOKENS = {
	wall: { kind: 'color', meaning: 'The page behind everything.' },
	surface: {
		kind: 'color',
		meaning: 'Cards and anything raised above the wall: active, important things.',
	},
	idle: { kind: 'color', meaning: 'Things that recede: inactive rows, chips and fields.' },
	ink: { kind: 'color', meaning: 'Body text and icons.' },
	'ink-soft': { kind: 'color', meaning: 'Secondary text: hints, captions, labels.' },
	line: { kind: 'color', meaning: 'Borders and dividers.' },
	attention: {
		kind: 'color',
		meaning: 'State: something needs a person (waiting suggestions, warnings, badges).',
	},
	now: { kind: 'color', meaning: 'State: now, done, healthy.' },
	sun: { kind: 'color', meaning: 'State: soon, highlighted, a pending or neutral highlight.' },
	info: { kind: 'color', meaning: 'State: information and focus rings.' },
	heat: { kind: 'color', meaning: 'State: high, hot, urgent but not blocking.' },
	'on-color': {
		kind: 'color',
		meaning:
			'Text and icons on the state colors `attention`, `now` and `info` (badges, buttons, check marks). Member initials and text over photos always use the day value, so a night value that is dark does not affect them.',
	},
	destructive: { kind: 'color', meaning: 'Deleting and other destructive actions.' },
	accent: {
		kind: 'color',
		meaning:
			'The one saturated surface a page may have: the next-up hero on Today and nothing else. Never written as text. A pack that wants no accent sets it to its `ink`.',
	},
	'on-accent': {
		kind: 'color',
		meaning:
			'Text and icons on `accent` (the hero), and the fill of the pill on it, which carries `accent` text.',
	},
	scrim: {
		kind: 'color',
		alpha: true,
		meaning: 'Darkens photos under text (family displays).',
	},
	backdrop: { kind: 'color', meaning: 'Behind full-screen photos and ambient mode.' },
	'shadow-lit': { kind: 'shadow', meaning: 'The soft shadow lifting cards off the wall.' },
	board: {
		kind: 'color',
		meaning:
			'The family board: the surface behind the notes. Text on it uses `ink` and `ink-soft`.',
	},
	'board-grain': {
		kind: 'color',
		alpha: true,
		meaning:
			"The board's texture (cork flecks, felt, lines), drawn over `board`. May be transparent.",
	},
	'note-1': {
		kind: 'color',
		meaning: 'Board notes: the first paper (the author picks one of five).',
	},
	'note-2': { kind: 'color', meaning: 'Board notes: the second paper.' },
	'note-3': { kind: 'color', meaning: 'Board notes: the third paper.' },
	'note-4': { kind: 'color', meaning: 'Board notes: the fourth paper.' },
	'note-5': { kind: 'color', meaning: 'Board notes: the fifth paper.' },
	'note-ink': { kind: 'color', meaning: 'Text on the note papers.' },
	'note-ink-soft': {
		kind: 'color',
		meaning: 'Secondary text on the note papers: the time, "until Friday", who has seen it.',
	},
	'note-tape': {
		kind: 'color',
		alpha: true,
		meaning: 'The strip of tape on a pinned note. May be transparent.',
	},
	'sky-cloud': {
		kind: 'color',
		alpha: true,
		meaning:
			'The weather sky: clouds and fog banks, drawn over the sky behind `ink` text. Light in both palettes; keep it faint at night so light text stays readable.',
	},
	'sky-flake': {
		kind: 'color',
		meaning: 'The weather sky: snowflakes. Light in both palettes.',
	},
} as const satisfies Record<string, TokenInfo>;

export type ModeToken = keyof typeof MODE_TOKENS;
export const MODE_TOKEN_NAMES = Object.keys(MODE_TOKENS) as ModeToken[];

/** Tokens a pack sets once, for both palettes. */
export const SHARED_TOKENS = {
	radius: {
		meaning: 'Corner rounding of items; cards and chips scale from it (0 to 2rem).',
	},
	font: {
		meaning:
			'The body typeface: "Figtree" (bundled, the default), "system", another bundled family, or a family the pack ships in `fonts`.',
	},
	'font-display': {
		meaning:
			"The display typeface (the clock, countdowns, big numbers, tracked caps labels): a bundled family or one the pack ships. Empty means the style's default.",
	},
	'font-serif': {
		meaning:
			"The serif typeface (the date, the hero title, the weather sentence): a bundled family or one the pack ships. Empty means the style's default.",
	},
} as const;
export type SharedToken = keyof typeof SHARED_TOKENS;
/** The font slots: the body (`font`) and the two a style composes with. */
export const FONT_SLOTS = ['font', 'font-display', 'font-serif'] as const;
export type FontSlot = (typeof FONT_SLOTS)[number];

/**
 * The custom property each token becomes in the stylesheet. The font slots are `--font-family…`,
 * not `--font-…`, because Tailwind's `--font-sans`, `--font-display` and `--font-serif` theme
 * variables read them (`theme.css`).
 */
export const cssVariable = (token: ModeToken | SharedToken): string =>
	token === 'font'
		? '--font-family'
		: token === 'font-display' || token === 'font-serif'
			? `--font-family-${token.slice('font-'.length)}`
			: `--${token}`;

/**
 * Fonts every theme can name without shipping them: the families the app self-hosts
 * (`packages/ui/src/fonts.css`, all SIL Open Font Licence, latin and latin-ext) and the device's
 * own (`system`). A pack may not ship a family under one of these names.
 */
export const BUNDLED_FONTS = [
	'Figtree',
	'Barlow Condensed',
	'Instrument Serif',
	'Archivo',
	'system',
] as const;
export type BundledFont = (typeof BUNDLED_FONTS)[number];
/** The bundled fonts that may be the body font (the display and serif faces are not for running text). */
export const BODY_FONTS = [
	'Figtree',
	'Archivo',
	'system',
] as const satisfies readonly BundledFont[];

/**
 * The contrast rules of a theme (WCAG 2.2): the pairs the web app really draws, no more. `min`
 * is the ratio the pair must reach; 4.5 is AA for text, 3 is AA for large text and markers.
 * Every rule below names where the app uses the pair; a pair nothing uses is not a rule (a
 * token only used as a decorative icon colour, like `sun` and `heat`, has none).
 */
export interface ContrastRule {
	foreground: ModeToken;
	background: ModeToken;
	min: number;
	/** Where the app draws this pair (documentation; keep it true). */
	use: string;
}

export const NOTE_PAPERS = ['note-1', 'note-2', 'note-3', 'note-4', 'note-5'] as const;

const TEXT_BACKGROUNDS = ['wall', 'surface', 'idle'] as const;

export const CONTRAST_RULES: readonly ContrastRule[] = [
	// Body and secondary text sit on the page, on cards and on receding chips and fields.
	...(['ink', 'ink-soft'] as const).flatMap((foreground) =>
		TEXT_BACKGROUNDS.map((background) => ({
			foreground,
			background,
			min: 4.5,
			use: `${foreground === 'ink' ? 'Body text' : 'Hints, captions and inactive chips'} on ${background}`,
		})),
	),
	// The family board: the empty "Write a note…" tile and any text sit on the board itself.
	...(['ink', 'ink-soft'] as const).map((foreground) => ({
		foreground,
		background: 'board' as const,
		min: 4.5,
		use: `${foreground} text on the family board (the empty note tile, its messages)`,
	})),
	// Board notes: text and secondary text on each of the five papers.
	...(['note-ink', 'note-ink-soft'] as const).flatMap((foreground) =>
		NOTE_PAPERS.map((background) => ({
			foreground,
			background,
			min: 4.5,
			use: `${foreground === 'note-ink' ? 'Note text' : 'Time, end date and seen-by on a note'} on ${background}`,
		})),
	),
	// Badges, "done" and confirm buttons, check discs: small bold text on a state color.
	...(['attention', 'now', 'info'] as const).map((background) => ({
		foreground: 'on-color' as const,
		background,
		min: 4.5,
		use: `Badge, button or check label on ${background} (bg-${background} text-on-color)`,
	})),
	// The next-up hero: its text on the accent, and the pill on it (accent text on on-accent).
	{
		foreground: 'on-accent',
		background: 'accent',
		min: 4.5,
		use: 'Title, times and countdown on the next-up hero (bg-accent text-on-accent); the pill inverts the pair',
	},
	// State colors written as text: error and status messages, links (text-attention, text-now,
	// text-info, text-destructive) on the page and on cards.
	...(['attention', 'now', 'info', 'destructive'] as const).flatMap((foreground) =>
		(['wall', 'surface'] as const).map((background) => ({
			foreground,
			background,
			min: 4.5,
			use: `${foreground} as message or link text on ${background}`,
		})),
	),
];
