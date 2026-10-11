import type { Occurrence } from '../contract/index.ts';

/** Where an occurrence stands against now: over, under way (or today, all day), or still ahead. */
export type When = 'past' | 'now' | 'upcoming';

/**
 * Whether an occurrence is over, under way or ahead, so the AI never tells a family that
 * something that already happened is coming up. `now` is the instant, `today` the family's
 * date (YYYY-MM-DD) at that instant. All-day dates are inclusive.
 */
export function whenOf(
	o: Pick<Occurrence, 'allDay' | 'start' | 'end' | 'startDate' | 'endDate'>,
	now: number,
	today: string,
): When {
	if (o.allDay) {
		const first = o.startDate as string;
		const last = o.endDate ?? first;
		if (last < today) return 'past';
		return first > today ? 'upcoming' : 'now';
	}
	const start = o.start as number;
	const end = o.end ?? start;
	if (end <= now) return 'past';
	return start > now ? 'upcoming' : 'now';
}
