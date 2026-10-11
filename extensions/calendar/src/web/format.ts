import { formatClock, formatDate, formatTime, type HourCycle } from '@famos/time';

/** Display helpers. Dates are `YYYY-MM-DD`; instants are epoch ms shown in the family zone. */
export function timeLabel(
	ms: number,
	timeZone: string,
	locale: string,
	hourCycle?: HourCycle,
): string {
	return formatTime(ms, timeZone, locale, hourCycle);
}

export interface WhenInput {
	allDay?: boolean | undefined;
	date: string;
	endDate?: string | null | undefined;
	startTime?: string | null | undefined;
	endTime?: string | null | undefined;
}

export function describeWhen(
	input: WhenInput,
	locale: string,
	allDayLabel: string,
	hourCycle?: HourCycle,
): string {
	const day = formatDate(input.date, locale);
	if (input.allDay) {
		return input.endDate && input.endDate !== input.date
			? `${day} – ${formatDate(input.endDate, locale)} · ${allDayLabel}`
			: `${day} · ${allDayLabel}`;
	}
	const clock = (time: string) => formatClock(time, locale, hourCycle);
	return `${day}, ${input.startTime ? clock(input.startTime) : ''}${input.endTime ? `–${clock(input.endTime)}` : ''}`;
}
