import { openDatabase, runMigrations } from '@famos/testing';
import { epochOf } from '@famos/time';
import { sql } from 'kysely';
import { expect, it } from 'vitest';
import { nextReminder } from '../src/server/reminders.ts';
import { type EventRow, migrations, toDetail } from '../src/server/store.ts';

const fresh = async () => {
	const handle = openDatabase({ path: ':memory:' });
	await runMigrations(handle.db, [{ scope: 'calendar', migrations }]);
	await sql`pragma foreign_keys = on`.execute(handle.db);
	return handle;
};

it('an event saved without a reminder choice gets the default', async () => {
	const handle = await fresh();
	const { db } = handle;
	const TZ = 'Europe/Istanbul';
	const start = epochOf('2026-10-20', '14:00', TZ);
	await sql`insert into calendar_events
		(id, title, all_day, starts_at, ends_at, time_zone, member_ids, created_at, updated_at)
		values ('cal_event_t', 'Timed', 0, ${start}, ${start + 3_600_000}, ${TZ}, '[]', 5, 5)`.execute(
		db,
	);
	await sql`insert into calendar_events
		(id, title, all_day, start_date, end_date, time_zone, member_ids, created_at, updated_at)
		values ('cal_event_d', 'All day', 1, '2026-10-21', '2026-10-21', ${TZ}, '[]', 5, 5)`.execute(
		db,
	);

	const rows = (await sql<EventRow>`select * from calendar_events order by id`.execute(db)).rows;
	const [allDay, timed] = rows as [EventRow, EventRow];
	expect(timed).toMatchObject({ reminder_set: 0, reminder_minutes: null, tags: null });
	expect(allDay).toMatchObject({ reminder_set: 0, reminder_minutes: null, tags: null });

	// 30 minutes before a timed event, 09:00 on the day for an all-day one.
	expect(toDetail(timed).reminder).toBe(30);
	expect(toDetail(allDay).reminder).toBe(0);
	const now = epochOf('2026-10-19', '10:00', TZ);
	expect(nextReminder(timed, now)).toEqual({ key: String(start), at: start - 30 * 60_000 });
	expect(nextReminder(allDay, now)).toEqual({
		key: '2026-10-21',
		at: epochOf('2026-10-21', '09:00', TZ),
	});
	await handle.close();
});

it('subscription events are keyed by UID and recurrence and go with their subscription', async () => {
	const handle = await fresh();
	const { db } = handle;
	await sql`insert into calendar_subscriptions
		(id, name, sealed_url, url_host, color, member_ids, reminders, allow_local, created_at, updated_at)
		values ('cal_sub_a', 'School', 'v1.x', 'school.example', '#3f7fb5', '[]', 0, 0, 1, 1)`.execute(
		db,
	);
	await sql`insert into calendar_external_events
		(subscription_id, uid, recurrence_key, title, all_day, start_date, end_date, time_zone, fingerprint)
		values ('cal_sub_a', 'u1', '', 'Holiday', 1, '2026-10-29', '2026-10-29', 'Europe/Istanbul', 'f')`.execute(
		db,
	);
	await expect(
		sql`insert into calendar_external_events
			(subscription_id, uid, recurrence_key, title, all_day, time_zone, fingerprint)
			values ('cal_sub_a', 'u1', '', 'Again', 1, 'UTC', 'f')`.execute(db),
	).rejects.toThrow();
	await sql`delete from calendar_subscriptions where id = 'cal_sub_a'`.execute(db);
	expect((await sql`select * from calendar_external_events`.execute(db)).rows).toHaveLength(0);

	// A tag is identified by its folded name.
	await sql`insert into calendar_tags (key, name, color, created_at) values ('okul', 'Okul', '#3f7fb5', 1)`.execute(
		db,
	);
	await expect(
		sql`insert into calendar_tags (key, name, color, created_at) values ('okul', 'OKUL', '#c38f22', 2)`.execute(
			db,
		),
	).rejects.toThrow();
	await handle.close();
});
