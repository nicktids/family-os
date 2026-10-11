import { addDays, compareDates, nextDate, type Recurrence, Temporal, toRRule } from '@famos/time';

/**
 * When a chore is due. Daily and weekly repeats are expanded by `@famos/time`; monthly repeats are
 * counted from the start date (never from the previous occurrence) and a day that does not exist
 * in a short month falls on its last day (Jan 31 → Feb 28 → Mar 31), because "the 31st" for a
 * household means "the end of the month". A one-off chore has one date and no next.
 */

/** The first due date strictly after `after`, or null when the chore does not repeat that far. */
export function dueAfter(
	recurrence: Recurrence | null,
	startDate: string,
	after: string,
): string | null {
	if (!recurrence) return compareDates(startDate, after) > 0 ? startDate : null;
	if (recurrence.freq === 'monthly') {
		const start = Temporal.PlainDate.from(startDate);
		for (let k = 0; k < 2400; k++) {
			const candidate = start.add({ months: k * recurrence.interval }).toString();
			if (recurrence.until && compareDates(candidate, recurrence.until) > 0) return null;
			if (compareDates(candidate, after) > 0) return candidate;
		}
		return null;
	}
	// DTSTART itself is an occurrence only when the rule's days include it; the helper decides.
	return nextDate({ date: startDate, rrule: toRRule(recurrence, null) }, after);
}

/** The first due date on or after `from` (the start date counts). */
export function dueFrom(
	recurrence: Recurrence | null,
	startDate: string,
	from: string,
): string | null {
	const base = compareDates(startDate, from) > 0 ? startDate : from;
	return dueAfter(recurrence, startDate, addDays(base, -1));
}

/**
 * The due date after a completion. Occurrences that were missed are skipped (the next one is after
 * today, or after the completed day when it was done early), so a chore never piles up behind a
 * holiday.
 */
export function dueAfterDone(
	recurrence: Recurrence | null,
	startDate: string,
	completedDue: string,
	today: string,
): string | null {
	if (!recurrence) return null;
	const after = compareDates(completedDue, today) > 0 ? completedDue : today;
	return dueAfter(recurrence, startDate, after);
}
