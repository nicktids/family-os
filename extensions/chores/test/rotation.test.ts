import type { Recurrence } from '@famos/time';
import { describe, expect, it } from 'vitest';
import { nextAssignee } from '../src/server/rotation.ts';
import { dueAfter, dueAfterDone, dueFrom } from '../src/server/schedule.ts';

const counts = (o: Record<string, number> = {}) => new Map(Object.entries(o));
const order = ['ayse', 'bora', 'cem'];

describe('rotation', () => {
	it('fixed keeps whoever is up, and starts with the first person', () => {
		const base = { rotation: 'fixed', order, doneBy: 'bora', counts: counts() } as const;
		expect(nextAssignee({ ...base, current: 'cem' })).toBe('cem');
		expect(nextAssignee({ ...base, current: null })).toBe('ayse');
		expect(nextAssignee({ ...base, current: 'gone' })).toBe('ayse');
	});

	it('round robin goes to the next person after whoever did it, and wraps', () => {
		const base = { rotation: 'round_robin', order, counts: counts() } as const;
		expect(nextAssignee({ ...base, current: 'ayse', doneBy: 'ayse' })).toBe('bora');
		expect(nextAssignee({ ...base, current: 'bora', doneBy: 'bora' })).toBe('cem');
		expect(nextAssignee({ ...base, current: 'cem', doneBy: 'cem' })).toBe('ayse');
		// Someone else stepped in: the turn moves on from the one who did it.
		expect(nextAssignee({ ...base, current: 'ayse', doneBy: 'cem' })).toBe('ayse');
		// A helper who is not in the list: from whose turn it was.
		expect(nextAssignee({ ...base, current: 'bora', doneBy: 'guest' })).toBe('cem');
	});

	it('least done picks the fewest completions, ties by position', () => {
		const base = { rotation: 'least_done', order, current: 'ayse', doneBy: 'ayse' } as const;
		expect(nextAssignee({ ...base, counts: counts({ ayse: 3, bora: 1, cem: 2 }) })).toBe('bora');
		expect(nextAssignee({ ...base, counts: counts({ ayse: 1, bora: 1 }) })).toBe('cem');
		expect(nextAssignee({ ...base, counts: counts({ ayse: 2, bora: 2, cem: 2 }) })).toBe('ayse');
		expect(nextAssignee({ ...base, counts: counts() })).toBe('ayse');
	});

	it('nobody in the list means anyone', () => {
		for (const rotation of ['fixed', 'round_robin', 'least_done'] as const)
			expect(
				nextAssignee({ rotation, order: [], current: null, doneBy: 'x', counts: counts() }),
			).toBeNull();
	});
});

describe('due dates', () => {
	const weekly: Recurrence = { freq: 'weekly', interval: 1, byDay: ['MO'] };

	it('a one-off chore has its start date and no next', () => {
		expect(dueFrom(null, '2026-10-10', '2026-10-06')).toBe('2026-10-10');
		expect(dueAfter(null, '2026-10-10', '2026-10-10')).toBeNull();
		expect(dueAfterDone(null, '2026-10-10', '2026-10-10', '2026-10-10')).toBeNull();
	});

	it('weekly: the first matching day, then a week later', () => {
		// 2026-10-07 is a Wednesday: the first Monday on or after is the 12th.
		expect(dueFrom(weekly, '2026-10-07', '2026-10-07')).toBe('2026-10-12');
		expect(dueFrom(weekly, '2026-10-05', '2026-10-05')).toBe('2026-10-05');
		expect(dueAfterDone(weekly, '2026-10-05', '2026-10-05', '2026-10-05')).toBe('2026-10-12');
	});

	it('skips what was missed instead of piling up, and keeps going from an early finish', () => {
		// Three weeks late: the next one is after today, not in the past.
		expect(dueAfterDone(weekly, '2026-10-05', '2026-10-05', '2026-10-27')).toBe('2026-11-02');
		// Done early: after the day it was due.
		expect(dueAfterDone(weekly, '2026-10-05', '2026-10-12', '2026-10-08')).toBe('2026-10-19');
		const daily: Recurrence = { freq: 'daily', interval: 1 };
		expect(dueAfterDone(daily, '2026-10-01', '2026-10-01', '2026-10-06')).toBe('2026-10-07');
	});

	it('monthly counts from the start and ends the month on its last day', () => {
		const monthly: Recurrence = { freq: 'monthly', interval: 1 };
		expect(dueAfter(monthly, '2026-01-31', '2026-01-31')).toBe('2026-02-28');
		expect(dueAfter(monthly, '2026-01-31', '2026-02-28')).toBe('2026-03-31');
		expect(dueAfter(monthly, '2026-01-31', '2026-03-31')).toBe('2026-04-30');
		// Leap year.
		expect(dueAfter(monthly, '2028-01-31', '2028-01-31')).toBe('2028-02-29');
		const every2: Recurrence = { freq: 'monthly', interval: 2 };
		expect(dueAfter(every2, '2026-10-15', '2026-10-15')).toBe('2026-12-15');
		expect(dueFrom(monthly, '2026-10-31', '2026-10-31')).toBe('2026-10-31');
	});

	it('stops after the end date', () => {
		const ends: Recurrence = { freq: 'weekly', interval: 1, byDay: ['MO'], until: '2026-10-12' };
		expect(dueAfter(ends, '2026-10-05', '2026-10-05')).toBe('2026-10-12');
		expect(dueAfter(ends, '2026-10-05', '2026-10-12')).toBeNull();
		const monthEnds: Recurrence = { freq: 'monthly', interval: 1, until: '2026-11-30' };
		expect(dueAfter(monthEnds, '2026-10-31', '2026-10-31')).toBe('2026-11-30');
		expect(dueAfter(monthEnds, '2026-10-31', '2026-11-30')).toBeNull();
	});
});
