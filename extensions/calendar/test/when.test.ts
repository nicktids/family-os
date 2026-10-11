import { describe, expect, it } from 'vitest';
import { whenOf } from '../src/server/when.ts';

const NOW = Date.parse('2026-10-10T09:00:00Z');
const TODAY = '2026-10-10';
const timed = (start: string, end: string | null) => ({
	allDay: false,
	start: Date.parse(start),
	end: end === null ? null : Date.parse(end),
	startDate: null,
	endDate: null,
});
const allDay = (startDate: string, endDate: string | null = null) => ({
	allDay: true,
	start: null,
	end: null,
	startDate,
	endDate,
});

describe('whenOf', () => {
	it('places timed events against the instant', () => {
		expect(whenOf(timed('2026-10-10T07:00:00Z', '2026-10-10T08:00:00Z'), NOW, TODAY)).toBe('past');
		expect(whenOf(timed('2026-10-10T08:00:00Z', '2026-10-10T09:00:00Z'), NOW, TODAY)).toBe('past');
		expect(whenOf(timed('2026-10-10T08:30:00Z', '2026-10-10T10:00:00Z'), NOW, TODAY)).toBe('now');
		expect(whenOf(timed('2026-10-10T09:30:00Z', '2026-10-10T10:00:00Z'), NOW, TODAY)).toBe(
			'upcoming',
		);
		expect(whenOf(timed('2026-10-10T08:59:00Z', null), NOW, TODAY)).toBe('past');
	});

	it('places all-day events against the family date, the last day inclusive', () => {
		expect(whenOf(allDay('2026-10-09'), NOW, TODAY)).toBe('past');
		expect(whenOf(allDay('2026-10-10'), NOW, TODAY)).toBe('now');
		expect(whenOf(allDay('2026-10-08', '2026-10-10'), NOW, TODAY)).toBe('now');
		expect(whenOf(allDay('2026-10-11'), NOW, TODAY)).toBe('upcoming');
	});
});
