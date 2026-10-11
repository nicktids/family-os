import { systemActor } from '@famos/sdk';
import { createTestKernel, type TestKernel } from '@famos/testing';
import { addDays, epochOf } from '@famos/time';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Occurrence, Subscription } from '../src/contract/index.ts';
import calendar from '../src/server/index.ts';
import { events } from '../src/server/store.ts';
import { ISTANBUL, ics } from './fixtures.ts';

/** RECURRENCE-ID;RANGE=THISANDFUTURE in imported calendars: the series is split. */

const TZ = 'Europe/Istanbul';
const FEED = 'https://club.example/swim.ics';
let k: TestKernel;

beforeEach(async () => {
	k = await createTestKernel({ extensions: [calendar] });
	await k.runner.invoke('core.updateFamilySettings', { timeZone: TZ }, systemActor('test'));
	k.clock.set(epochOf('2026-10-07', '09:00', TZ));
});
afterEach(() => k.close());

const series = (rrule: string, ...extra: string[]) => [
	'BEGIN:VEVENT',
	'UID:swim@club.example',
	'DTSTAMP:20261001T000000Z',
	'DTSTART;TZID=Europe/Istanbul:20261008T090000',
	'DTEND;TZID=Europe/Istanbul:20261008T100000',
	`RRULE:${rrule}`,
	...extra,
	'SUMMARY:Swim',
	'END:VEVENT',
];

/** From the occurrence 2026-10-22 on: the given properties replace the series'. */
const future = (...props: string[]) => [
	'BEGIN:VEVENT',
	'UID:swim@club.example',
	'DTSTAMP:20261001T000000Z',
	'RECURRENCE-ID;TZID=Europe/Istanbul;RANGE=THISANDFUTURE:20261022T090000',
	...props,
	'END:VEVENT',
];

const feed = (...components: string[][]) =>
	ics(
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Club//EN',
		...ISTANBUL,
		...components.flat(),
		'END:VCALENDAR',
	);

async function load(text: string) {
	k.http.serve(FEED, { text });
	const admin = await k.member('admin');
	const r = await k.runner.invoke<Subscription>(
		'calendar.addSubscription',
		{ name: 'Club', url: FEED },
		admin.actor,
	);
	if (r.status !== 'applied') throw new Error('expected applied');
	await k.worker.drain();
	return events(k.ctx.db)
		.selectFrom('calendar_external_events')
		.selectAll()
		.orderBy('starts_at')
		.execute();
}

/** The API limits a range to 62 days; this asks in disjoint 30-day pieces. */
async function list(from: string, to: string): Promise<Occurrence[]> {
	const out: Occurrence[] = [];
	for (let start = from; start <= to; start = addDays(start, 30)) {
		const end = addDays(start, 29) < to ? addDays(start, 29) : to;
		out.push(
			...(await k.route('calendar.listOccurrences').call({ query: { from: start, to: end } })),
		);
	}
	return out;
}

/** "2026-10-22 10:30 Title" in the family zone. */
const shown = (o: Occurrence) => {
	const when = new Intl.DateTimeFormat('sv-SE', {
		timeZone: TZ,
		dateStyle: 'short',
		timeStyle: 'short',
	}).format(new Date(o.start as number));
	return `${when} ${o.title}`;
};

describe('THISANDFUTURE overrides', () => {
	it('splits a weekly series at a time change and keeps the earlier part as it was', async () => {
		const rows = await load(
			feed(
				series('FREQ=WEEKLY;BYDAY=TH;UNTIL=20261126T000000Z'),
				future(
					'DTSTART;TZID=Europe/Istanbul:20261022T103000',
					'DTEND;TZID=Europe/Istanbul:20261022T113000',
					'SUMMARY:Swim (evening pool)',
				),
			),
		);
		// Two series, still recurring (not expanded into single events).
		expect(rows).toHaveLength(2);
		expect(rows[0]?.rrule).toMatch(/UNTIL=20261022T055959Z$/);
		expect(rows[1]?.rrule).toBe('FREQ=WEEKLY;BYDAY=TH;UNTIL=20261126T000000Z');
		expect((await list('2026-10-01', '2026-12-31')).map(shown)).toEqual([
			'2026-10-08 09:00 Swim',
			'2026-10-15 09:00 Swim',
			'2026-10-22 10:30 Swim (evening pool)',
			'2026-10-29 10:30 Swim (evening pool)',
			'2026-11-05 10:30 Swim (evening pool)',
			'2026-11-12 10:30 Swim (evening pool)',
			'2026-11-19 10:30 Swim (evening pool)',
		]);
	});

	it('reduces COUNT by what the first part used', async () => {
		await load(
			feed(
				series('FREQ=WEEKLY;BYDAY=TH;COUNT=6'),
				future(
					'DTSTART;TZID=Europe/Istanbul:20261022T103000',
					'DTEND;TZID=Europe/Istanbul:20261022T113000',
					'SUMMARY:Swim',
				),
			),
		);
		// Six in total: two at 09:00, then four at 10:30 (the last on 11-12).
		expect((await list('2026-10-01', '2027-03-31')).map(shown)).toEqual([
			'2026-10-08 09:00 Swim',
			'2026-10-15 09:00 Swim',
			'2026-10-22 10:30 Swim',
			'2026-10-29 10:30 Swim',
			'2026-11-05 10:30 Swim',
			'2026-11-12 10:30 Swim',
		]);
	});

	it('keeps exclusions on both sides of the split, at the new time after it', async () => {
		await load(
			feed(
				series(
					'FREQ=WEEKLY;BYDAY=TH;COUNT=6',
					'EXDATE;TZID=Europe/Istanbul:20261015T090000',
					'EXDATE;TZID=Europe/Istanbul:20261105T090000',
				),
				future(
					'DTSTART;TZID=Europe/Istanbul:20261022T103000',
					'DTEND;TZID=Europe/Istanbul:20261022T113000',
					'SUMMARY:Swim',
				),
			),
		);
		expect((await list('2026-10-01', '2027-03-31')).map(shown)).toEqual([
			'2026-10-08 09:00 Swim',
			'2026-10-22 10:30 Swim',
			'2026-10-29 10:30 Swim',
			'2026-11-12 10:30 Swim',
		]);
	});

	it('starts a different rule when the override brings its own', async () => {
		await load(
			feed(
				series('FREQ=WEEKLY;BYDAY=TH', 'EXDATE;TZID=Europe/Istanbul:20261029T090000'),
				future(
					'DTSTART;TZID=Europe/Istanbul:20261022T090000',
					'DTEND;TZID=Europe/Istanbul:20261022T100000',
					'RRULE:FREQ=DAILY;COUNT=3',
					'SUMMARY:Camp',
				),
			),
		);
		expect((await list('2026-10-01', '2026-12-31')).map(shown)).toEqual([
			'2026-10-08 09:00 Swim',
			'2026-10-15 09:00 Swim',
			'2026-10-22 09:00 Camp',
			'2026-10-23 09:00 Camp',
			'2026-10-24 09:00 Camp',
		]);
	});

	it('ends the series at a cancelled THISANDFUTURE', async () => {
		await load(
			feed(
				series('FREQ=WEEKLY;BYDAY=TH'),
				future('DTSTART;TZID=Europe/Istanbul:20261022T090000', 'STATUS:CANCELLED', 'SUMMARY:Swim'),
			),
		);
		expect((await list('2026-10-01', '2026-12-31')).map(shown)).toEqual([
			'2026-10-08 09:00 Swim',
			'2026-10-15 09:00 Swim',
		]);
	});

	it('expands into single events when the weekday moves and the rule names days', async () => {
		const rows = await load(
			feed(
				series('FREQ=WEEKLY;BYDAY=TH;COUNT=6', 'EXDATE;TZID=Europe/Istanbul:20261105T090000'),
				future(
					'DTSTART;TZID=Europe/Istanbul:20261023T100000',
					'DTEND;TZID=Europe/Istanbul:20261023T110000',
					'SUMMARY:Swim (Friday)',
				),
			),
		);
		expect(rows.every((r) => r.rrule === null)).toBe(true);
		expect((await list('2026-10-01', '2027-03-31')).map(shown)).toEqual([
			'2026-10-08 09:00 Swim',
			'2026-10-15 09:00 Swim',
			'2026-10-23 10:00 Swim (Friday)',
			'2026-10-30 10:00 Swim (Friday)',
			// 11-05 is excluded; the sixth (11-12) moves to Friday 11-13.
			'2026-11-13 10:00 Swim (Friday)',
		]);
	});

	it('splits an all-day series', async () => {
		const rows = await load(
			feed(
				[
					'BEGIN:VEVENT',
					'UID:hol@club.example',
					'DTSTAMP:20261001T000000Z',
					'DTSTART;VALUE=DATE:20261008',
					'RRULE:FREQ=WEEKLY;BYDAY=TH',
					'SUMMARY:Market',
					'END:VEVENT',
				],
				[
					'BEGIN:VEVENT',
					'UID:hol@club.example',
					'DTSTAMP:20261001T000000Z',
					'RECURRENCE-ID;VALUE=DATE;RANGE=THISANDFUTURE:20261022',
					'DTSTART;VALUE=DATE:20261022',
					'SUMMARY:Big market',
					'END:VEVENT',
				],
			),
		);
		expect(rows).toHaveLength(2);
		const days = (await list('2026-10-01', '2026-11-12')).map((o) => `${o.startDate} ${o.title}`);
		expect(days).toEqual([
			'2026-10-08 Market',
			'2026-10-15 Market',
			'2026-10-22 Big market',
			'2026-10-29 Big market',
			'2026-11-05 Big market',
			'2026-11-12 Big market',
		]);
	});
});
