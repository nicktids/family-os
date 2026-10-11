import { type Tag, tagKey } from '../contract/index.js';

/** Shown for a tag the family list does not know (a subscription's categories). */
export const NEUTRAL_TAG_COLOR = 'var(--ink-soft)';

/** Name → colour lookup by the tag's identity (case-insensitive). */
export function colorOf(tags: readonly Tag[], name: string): string {
	const key = tagKey(name);
	return tags.find((tag) => tagKey(tag.name) === key)?.color ?? NEUTRAL_TAG_COLOR;
}

/**
 * Keeps the items that carry at least one of the selected tags. No selection means everything.
 * Tags are compared the way the server does: case-insensitive.
 */
export function filterByTags<T extends { tags: readonly string[] }>(
	items: readonly T[],
	selected: readonly string[],
): T[] {
	if (selected.length === 0) return [...items];
	const wanted = new Set(selected.map(tagKey));
	return items.filter((item) => item.tags.some((name) => wanted.has(tagKey(name))));
}

/** Drops selected tags the family list no longer has (deleted or renamed elsewhere). */
export function pruneSelection(selected: readonly string[], tags: readonly Tag[]): string[] {
	const known = new Set(tags.map((tag) => tagKey(tag.name)));
	return selected.filter((name) => known.has(tagKey(name)));
}

/** Suggestions for the tag input: unused family tags that start with (or contain) what was typed. */
export function suggestTags(tags: readonly Tag[], chosen: readonly string[], typed: string): Tag[] {
	const taken = new Set(chosen.map(tagKey));
	const query = tagKey(typed);
	return tags
		.filter((tag) => !taken.has(tagKey(tag.name)))
		.filter((tag) => query === '' || tagKey(tag.name).includes(query))
		.slice(0, 8);
}

const STORAGE_KEY = 'famos.calendar.tagFilter';

/** The tag filter this device remembers. Storage can be missing or blocked: then nothing is remembered. */
export function loadTagFilter(): string[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		const parsed: unknown = raw ? JSON.parse(raw) : [];
		return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
	} catch {
		return [];
	}
}

export function saveTagFilter(selected: readonly string[]): void {
	try {
		if (selected.length === 0) localStorage.removeItem(STORAGE_KEY);
		else localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
	} catch {
		// Not remembered; the filter still works for this visit.
	}
}
