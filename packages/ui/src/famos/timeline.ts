import type { TimelineItem } from '../slots.js';

/** Order of the groups on a day: all-day, timed, any time, evening. */
const GROUP = { allday: 0, timed: 1, anytime: 2, evening: 3 } as const;

export const groupOf = (item: TimelineItem): number =>
	item.slot ? GROUP[item.slot] : item.start === undefined ? GROUP.anytime : GROUP.timed;

/** All-day → timed by start → any time → evening; ties keep their given order, then the title. */
export function sortTimeline(items: readonly TimelineItem[]): TimelineItem[] {
	return items
		.map((item, index) => ({ item, index }))
		.sort(
			(a, b) =>
				groupOf(a.item) - groupOf(b.item) ||
				(a.item.start ?? 0) - (b.item.start ?? 0) ||
				a.index - b.index,
		)
		.map(({ item }) => item);
}

/** Whether a timed item has ended by `now` (an item without an end ends when it starts). */
export const hasEnded = (item: TimelineItem, now: number): boolean =>
	groupOf(item) === GROUP.timed && (item.end ?? item.start ?? 0) <= now;

export interface TimelineView {
	items: TimelineItem[];
	/** The now-line goes before the item at this index (items.length: after all of them). */
	nowIndex: number;
	/** The first timed item that starts after now; the one lit card. */
	nextId: string | null;
}

/**
 * Arranges a day's items around `now`. The now-line sits after the all-day items and every
 * timed item that has started; the next item is the first timed one still to come. Meal-plan
 * style items (`nominal`) are placed by their time but are never "next".
 */
export function viewTimeline(items: readonly TimelineItem[], now: number): TimelineView {
	const sorted = sortTimeline(items);
	let nowIndex = 0;
	for (const item of sorted) {
		const group = groupOf(item);
		if (group === GROUP.allday || (group === GROUP.timed && (item.start ?? 0) <= now)) nowIndex++;
		else break;
	}
	const next = sorted.find(
		(item) => groupOf(item) === GROUP.timed && !item.nominal && (item.start ?? 0) > now,
	);
	return { items: sorted, nowIndex, nextId: next?.id ?? null };
}

export interface TimelineLabels {
	allDay: string;
	anytime: string;
	evening: string;
	/** On the lit item when the day is not today ("first"). */
	first: string;
	/** "in 20 min" for the lit item, from the minutes until it starts. */
	until(minutes: number): string;
}
