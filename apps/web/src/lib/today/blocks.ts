import type { TodayBand } from '@famos/ui/slots';

/**
 * What Today shows (show or hide only; each style keeps its composition). Today is
 * made of blocks: the built-in ones below and every `dashboard.card` contribution, by its id. A
 * person, the family or a display keeps a list of the blocks it hides (core's `today.hidden`), so
 * a block that is new, or that this app does not know, is shown by default.
 */

export interface TodayBlock {
	/** Built-in: a plain word (`weather`); a card: its contribution id (`lists.tasks`). */
	id: string;
	/** Translation key of its name (the app's, or namespaced `<extension>:<key>` for a card). */
	labelKey: string;
	/** Translation key of one line on what it is. */
	hintKey?: string;
}

interface BuiltIn extends TodayBlock {
	/** Only on a person's Today (a display has no sentence and nothing to act on). */
	person?: boolean;
	/** The extension that brings it: not offered while it is off. */
	ext?: string;
}

/** The built-in blocks, in the order the settings list shows them (roughly top to bottom). */
const BUILT_INS: readonly BuiltIn[] = [
	{ id: 'clock', labelKey: 'app:block_clock', hintKey: 'app:block_clock_hint' },
	{
		id: 'greeting',
		labelKey: 'app:block_greeting',
		hintKey: 'app:block_greeting_hint',
		person: true,
	},
	{
		id: 'weather',
		labelKey: 'app:block_weather',
		hintKey: 'app:block_weather_hint',
		ext: 'ambient',
	},
	{
		id: 'photo',
		labelKey: 'app:block_photo',
		hintKey: 'app:block_photo_hint',
		ext: 'ambient',
	},
	{ id: 'next', labelKey: 'app:block_next', hintKey: 'app:block_next_hint' },
	{ id: 'day', labelKey: 'app:block_day', hintKey: 'app:block_day_hint' },
	{ id: 'family', labelKey: 'app:block_family', hintKey: 'app:block_family_hint' },
	{
		id: 'chores',
		labelKey: 'app:block_chores',
		hintKey: 'app:block_chores_hint',
		ext: 'chores',
	},
	{
		id: 'needs',
		labelKey: 'app:block_needs',
		hintKey: 'app:block_needs_hint',
		person: true,
	},
	{
		id: 'kitchen',
		labelKey: 'app:block_kitchen',
		hintKey: 'app:block_kitchen_hint',
		ext: 'kitchen',
	},
	{
		id: 'nextDays',
		labelKey: 'app:block_next_days',
		hintKey: 'app:block_next_days_hint',
	},
	{ id: 'done', labelKey: 'app:block_done', hintKey: 'app:block_done_hint' },
];

/** The ids of the built-in blocks. */
export const BUILT_IN_BLOCKS: readonly string[] = BUILT_INS.map((b) => b.id);

/**
 * A card whose block is a built-in one: the chores card is the rings the page draws, so the two
 * are one block.
 */
const TIED: Readonly<Record<string, string>> = { 'chores.today': 'chores' };

/** What the blocks list needs of a `dashboard.card` contribution. */
export interface CardLike {
	id: string;
	band?: TodayBand;
	labelKey?: string;
	hintKey?: string;
}

/**
 * The block that decides whether a card shows: the cards of the `needs` band are Needs you, a
 * tied card its built-in block, any other card is a block of its own.
 */
export const blockOfCard = (card: CardLike): string =>
	card.band === 'needs' ? 'needs' : (TIED[card.id] ?? card.id);

/** Whether a block shows, given what is hidden. */
export const shows = (hidden: ReadonlySet<string> | readonly string[], block: string): boolean =>
	hidden instanceof Set ? !hidden.has(block) : !(hidden as readonly string[]).includes(block);

/**
 * The blocks a viewer can choose from: the built-in ones (without those of extensions that are
 * off; a display without the person's own), then the cards that are blocks of their own, named
 * by their `labelKey` or else by their extension's name (`extensionLabel`).
 */
export function todayBlocks(
	cards: readonly CardLike[],
	options: {
		familyMode?: boolean;
		disabledExtensions?: readonly string[];
		extensionLabel?: (extensionId: string) => string | undefined;
	} = {},
): TodayBlock[] {
	const off = options.disabledExtensions ?? [];
	const builtIns = BUILT_INS.filter(
		(b) => !(options.familyMode && b.person) && !(b.ext && off.includes(b.ext)),
	).map(({ id, labelKey, hintKey }) => ({ id, labelKey, ...(hintKey && { hintKey }) }));
	const own = new Set(builtIns.map((b) => b.id));
	const seen = new Set<string>();
	const fromCards: TodayBlock[] = [];
	for (const card of cards) {
		const id = blockOfCard(card);
		if (id !== card.id || own.has(id) || seen.has(id)) continue;
		seen.add(id);
		const ext = id.split('.')[0] ?? id;
		const labelKey = card.labelKey ?? options.extensionLabel?.(ext) ?? id;
		fromCards.push({ id, labelKey, ...(card.hintKey && { hintKey: card.hintKey }) });
	}
	return [...builtIns, ...fromCards];
}

/** Whether nothing that could show is shown (Today then says so, with a way back). */
export const everythingHidden = (
	blocks: readonly TodayBlock[],
	hidden: ReadonlySet<string> | readonly string[],
): boolean => blocks.length > 0 && blocks.every((b) => !shows(hidden, b.id));

/**
 * The hidden list after showing or hiding one block. Ids of blocks this viewer cannot see (a
 * card of an extension that is off, a block of a future version) are kept as they are.
 */
export function withBlock(hidden: readonly string[], block: string, show: boolean): string[] {
	const rest = hidden.filter((id) => id !== block);
	return show ? rest : [...rest, block];
}
