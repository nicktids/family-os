import { describe, expect, it } from 'vitest';
import type { RecordsT } from '../src/web/i18n.ts';
import { dueLabel, dueStatus, stillMatters } from '../src/web/status.ts';

const t = ((key: string, params?: Record<string, unknown>) =>
	params ? `${key} ${JSON.stringify(params)}` : key) as unknown as RecordsT;
const TODAY = '2026-10-11';
const duty = (dueDate: string) => ({ dueDate, leadDays: 30, lapses: false });
const warranty = (dueDate: string) => ({ dueDate, leadDays: 30, lapses: true });

describe('dueStatus', () => {
	it('makes a past duty overdue but a past lapsing date only ended', () => {
		expect(dueStatus(duty('2025-04-12'), TODAY)).toBe('overdue');
		expect(dueStatus(warranty('2025-04-12'), TODAY)).toBe('ended');
		expect(dueStatus(warranty('2026-10-10'), TODAY)).toBe('ended');
	});

	it('treats a lapsing date on or before its day like any other date', () => {
		expect(dueStatus(warranty(TODAY), TODAY)).toBe('soon');
		expect(dueStatus(warranty('2026-10-23'), TODAY)).toBe('soon');
		expect(dueStatus(warranty('2027-01-01'), TODAY)).toBe('ok');
	});

	it('keeps late duties and coming dates in the lists, not ended ones', () => {
		expect(stillMatters(duty('2025-04-12'), TODAY)).toBe(true);
		expect(stillMatters(warranty(TODAY), TODAY)).toBe(true);
		expect(stillMatters(warranty('2026-10-10'), TODAY)).toBe(false);
	});
});

describe('dueLabel', () => {
	it('says when a lapsing date ended instead of how late it is', () => {
		expect(dueLabel(warranty('2025-04-12'), TODAY, t, 'en-GB')).toBe(
			'ended_on {"date":"12 Apr 2025"}',
		);
		expect(dueLabel(duty('2025-04-12'), TODAY, t, 'en-GB')).toBe(
			'overdue_days {"count":547,"date":"12 Apr 2025"}',
		);
	});

	it('counts the days to a coming lapsing date', () => {
		expect(dueLabel(warranty('2026-10-23'), TODAY, t, 'en-GB')).toBe(
			'due_in_days {"count":12,"date":"23 Oct 2026"}',
		);
		expect(dueLabel(warranty(TODAY), TODAY, t, 'en-GB')).toBe('due_today');
	});
});
