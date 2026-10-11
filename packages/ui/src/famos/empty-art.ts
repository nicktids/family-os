/**
 * The small drawings of empty pages (`EmptyState`'s `art`), one per area. `generic` is for a page
 * without a drawing of its own.
 */
export const EMPTY_ART_NAMES = [
	'calendar',
	'tasks',
	'shopping',
	'board',
	'chores',
	'vehicles',
	'home',
	'pets',
	'kitchen',
	'assistant',
	'quick-add',
	'devices',
	'generic',
] as const;

export type EmptyArtName = (typeof EMPTY_ART_NAMES)[number];
