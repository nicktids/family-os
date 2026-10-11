import { describe, expect, it } from 'vitest';
import { fromRule, nextDue, toRule } from '../src/server/recurrence.ts';

describe('obligation repeats', () => {
	it('stores an RFC 5545 rule and reads it back', () => {
		expect(toRule({ months: 3 })).toBe('FREQ=MONTHLY;INTERVAL=3');
		expect(toRule({ years: 1 })).toBe('FREQ=YEARLY;INTERVAL=1');
		expect(fromRule('FREQ=MONTHLY;INTERVAL=6')).toEqual({ months: 6 });
		expect(fromRule('FREQ=YEARLY;INTERVAL=2')).toEqual({ years: 2 });
		expect(fromRule('FREQ=WEEKLY;BYDAY=MO')).toBeNull();
		expect(fromRule(null)).toBeNull();
	});

	it('moves a monthly date on the 31st to the end of short months and back', () => {
		expect(nextDue('2026-01-31', { months: 1 }, '2026-01-31')).toBe('2026-02-28');
		expect(nextDue('2026-01-31', { months: 1 }, '2026-02-28')).toBe('2026-03-31');
		expect(nextDue('2026-01-31', { months: 1 }, '2026-03-31')).toBe('2026-04-30');
		// A leap year keeps the 29th of February.
		expect(nextDue('2027-12-31', { months: 2 }, '2027-12-31')).toBe('2028-02-29');
	});

	it('counts every N months from the first date', () => {
		expect(nextDue('2026-11-30', { months: 3 }, '2026-11-30')).toBe('2027-02-28');
		expect(nextDue('2026-11-30', { months: 3 }, '2027-02-28')).toBe('2027-05-30');
		expect(nextDue('2026-10-15', { months: 6 }, '2026-10-15')).toBe('2027-04-15');
	});

	it('handles 29 February in yearly repeats', () => {
		expect(nextDue('2028-02-29', { years: 1 }, '2028-02-29')).toBe('2029-02-28');
		expect(nextDue('2028-02-29', { years: 1 }, '2031-02-28')).toBe('2032-02-29');
		expect(nextDue('2028-02-29', { years: 4 }, '2028-02-29')).toBe('2032-02-29');
	});

	it('returns the first date after a later point, skipping missed ones', () => {
		expect(nextDue('2026-06-15', { months: 1 }, '2026-10-06')).toBe('2026-10-15');
		expect(nextDue('2026-06-15', { months: 1 }, '2026-10-15')).toBe('2026-11-15');
		expect(nextDue('2025-03-01', { years: 1 }, '2026-10-06')).toBe('2027-03-01');
	});
});
