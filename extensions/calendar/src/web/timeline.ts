import { addDays, dayBounds } from '@famos/time';
import type { DayItem, TimelineApp, TimelineContribution, TimelineItem } from '@famos/ui/slots';
import type { Occurrence } from '../contract/index.js';
import { loadRange, onDay } from './data.js';
import { timeLabel } from './format.js';

/** One occurrence as a row of a day's timeline (Today, and the phone calendar's agenda). */
export function toTimelineItem(o: Occurrence, day: string, app: TimelineApp): TimelineItem {
	const timeZone = app.timeZone();
	const { start: dayStart } = dayBounds(day, timeZone);
	const names = new Map(app.members().map((m) => [m.id, m.displayName]));
	const clock = (at: number) => timeLabel(at, timeZone, app.formatLocale(), app.hourCycle());
	const timed = !o.allDay && o.start !== null && o.end !== null;
	const who = o.source
		? o.source.name
		: o.memberIds
				.map((id) => names.get(id))
				.filter((n) => n !== undefined)
				.join(', ');
	const range =
		timed && o.end !== null && o.end - (o.start as number) >= 60_000
			? `${clock(o.start as number)}–${clock(o.end)}`
			: '';
	const subtitle = [who, range, o.location ?? ''].filter(Boolean).join(' · ');
	return {
		id: `calendar:${o.eventId}:${o.key}`,
		...(timed
			? { start: Math.max(o.start as number, dayStart), end: o.end as number }
			: { slot: 'allday' as const }),
		title: o.title,
		...(subtitle && { subtitle }),
		...(o.location && { location: o.location }),
		members: o.memberIds,
		kind: 'event',
		href: '/calendar',
	};
}

/** Today's events for the day's timeline on Today. */
export const calendarTimeline: TimelineContribution = {
	id: 'calendar.today',
	invalidateOn: ['calendar.'],
	async load(day, app) {
		const timeZone = app.timeZone();
		const occurrences = (await loadRange(day, day)).filter((o) => onDay(o, day, timeZone));
		return occurrences.map((o) => toTimelineItem(o, day, app));
	},
	// The look-ahead of a light day: one range call; a multi-day event shows on its first day.
	async loadAhead(from, to, app) {
		const timeZone = app.timeZone();
		const occurrences = await loadRange(from, to);
		const seen = new Set<string>();
		const items: DayItem[] = [];
		for (let day = from; day <= to; day = addDays(day, 1)) {
			for (const o of occurrences) {
				const key = `${o.eventId}:${o.key}`;
				if (seen.has(key) || !onDay(o, day, timeZone)) continue;
				seen.add(key);
				items.push({ ...toTimelineItem(o, day, app), day });
			}
		}
		return items;
	},
};
