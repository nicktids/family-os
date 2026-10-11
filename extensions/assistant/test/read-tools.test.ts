import calendar from '@famos/ext-calendar/server';
import lists from '@famos/ext-lists/server';
import records from '@famos/ext-records/server';
import vehicles from '@famos/ext-vehicles/server';
import { type Actor, type MemberId, systemActor } from '@famos/sdk';
import { createTestKernel, type TestKernel } from '@famos/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// The read tools of the areas, run the way the assistant runs them: as the AI on behalf of a member.
let k: TestKernel;
let admin: Awaited<ReturnType<TestKernel['member']>>;
let kid: Awaited<ReturnType<TestKernel['member']>>;
const aiFor = (who: typeof admin): Actor => ({
	kind: 'ai',
	source: 'assistant',
	onBehalfOf: who.member.id as MemberId,
	roleId: who.actor.roleId,
});
const read = async <T>(id: string, input: unknown, who = admin): Promise<T> => {
	const result = await k.runner.invoke<T>(id, input, aiFor(who));
	if (result.status !== 'applied') throw new Error('a read must apply');
	return result.output;
};

beforeEach(async () => {
	k = await createTestKernel({ extensions: [calendar, lists, records, vehicles] });
	await k.runner.invoke(
		'core.updateFamilySettings',
		{ timeZone: 'Europe/Istanbul', locale: 'en' },
		systemActor('test'),
	);
	admin = await k.member('admin', 'Ayşe');
	kid = await k.member('supervised', 'Elif');
});
afterEach(() => k.close());

describe('calendar.findEvents', () => {
	it('lists occurrences in order, filters by tag and says when it cut the list', async () => {
		const add = (input: Record<string, unknown>) =>
			k.runner.invoke('calendar.createEvent', input, admin.actor);
		await add({ title: 'Swim', date: '2026-01-06', startTime: '17:30', tags: ['sport'] });
		await add({
			title: 'School trip',
			date: '2026-01-05',
			allDay: true,
			endDate: '2026-01-06',
			tags: ['school'],
		});
		await add({
			title: 'Walk',
			date: '2026-01-07',
			startTime: '08:00',
			recurrence: { freq: 'daily' },
			memberIds: [admin.member.id],
		});

		const week = await read<{
			events: {
				title: string;
				date: string;
				time: string | null;
				endDate: string | null;
				recurring: boolean;
			}[];
			truncated: boolean;
		}>('calendar.findEvents', { from: '2026-01-05', to: '2026-01-08' });
		expect(week.events.map((e) => `${e.date} ${e.title}`)).toEqual([
			'2026-01-05 School trip',
			'2026-01-06 Swim',
			'2026-01-07 Walk',
			'2026-01-08 Walk',
		]);
		expect(week.events[0]).toMatchObject({ time: null, endDate: '2026-01-06' });
		expect(week.events[1]).toMatchObject({ time: '17:30-18:30' });
		expect(week.events[2]).toMatchObject({ recurring: true });
		expect(week.truncated).toBe(false);

		const school = await read<{ events: { title: string }[] }>('calendar.findEvents', {
			from: '2026-01-05',
			to: '2026-01-08',
			tag: 'SCHOOL',
		});
		expect(school.events.map((e) => e.title)).toEqual(['School trip']);

		await expect(
			k.runner.invoke(
				'calendar.findEvents',
				{ from: '2026-01-01', to: '2026-06-01' },
				aiFor(admin),
			),
		).rejects.toMatchObject({ code: 'bad_request' });
	});

	it('is available to a supervised member (calendar.view is a view capability)', async () => {
		const result = await read<{ events: unknown[] }>(
			'calendar.findEvents',
			{ from: '2026-01-01', to: '2026-01-02' },
			kid,
		);
		expect(result.events).toEqual([]);
	});
});

describe('lists tools', () => {
	it('lists open tasks, optionally for one assignee', async () => {
		const add = (input: Record<string, unknown>) =>
			k.runner.invoke('lists.addTask', input, admin.actor);
		await add({ title: 'Pay the fee', dueDate: '2026-01-09', assigneeId: admin.member.id });
		await add({ title: 'Someday' });
		await add({ title: 'Elif’s form', dueDate: '2026-01-03', assigneeId: kid.member.id });
		const done = await k.runner.invoke<{ id: string }>(
			'lists.addTask',
			{ title: 'Done already' },
			admin.actor,
		);
		if (done.status !== 'applied') throw new Error('expected applied');
		await k.runner.invoke('lists.completeTask', { id: done.output.id }, admin.actor);

		const all = await read<{ tasks: { title: string; assigneeId: string | null }[] }>(
			'lists.openTasks',
			{},
		);
		expect(all.tasks.map((t) => t.title)).toEqual(['Elif’s form', 'Pay the fee', 'Someday']);
		const hers = await read<{ tasks: { title: string }[] }>('lists.openTasks', {
			assignee: kid.member.id,
		});
		expect(hers.tasks.map((t) => t.title)).toEqual(['Elif’s form']);
	});

	it('shows what is still to buy, by list name', async () => {
		await k.runner.invoke(
			'lists.addShoppingItems',
			{
				items: [
					{ title: 'Milk', quantity: '2', category: 'dairy' },
					{ title: 'Soap', category: 'household' },
					{ title: 'Apples', category: 'produce' },
				],
			},
			admin.actor,
		);
		const list = await read<{
			lists: { name: string; items: { title: string; quantity: string | null }[] }[];
		}>('lists.shoppingList', {});
		expect(list.lists).toHaveLength(1);
		// Store-section order: produce, dairy…, household.
		expect(list.lists[0]?.items.map((i) => i.title)).toEqual(['Apples', 'Milk', 'Soap']);
		expect(list.lists[0]?.items[1]).toMatchObject({ quantity: '2' });
		expect(
			(await read<{ lists: unknown[] }>('lists.shoppingList', { list: 'Nope' })).lists,
		).toEqual([]);
		expect(
			(await read<{ lists: unknown[] }>('lists.shoppingList', { list: 'market' })).lists,
		).toHaveLength(1);
	});
});

describe('records.upcoming', () => {
	const car = 'vehicle_01990000-0000-7000-8000-000000000001';
	beforeEach(async () => {
		const add = (title: string, dueDate: string, audience?: string) =>
			k.runner.invoke(
				'records.addObligation',
				{
					title,
					dueDate,
					recordId: car,
					recordKind: 'vehicle',
					recordName: 'Clio',
					...(audience && { audience }),
				},
				admin.actor,
			);
		await add('Inspection', '2026-01-10', 'vehicles.view');
		await add('Overdue tyres', '2025-12-20', 'vehicles.view');
		await add('Far away', '2026-06-01');
		await add('Plain duty', '2026-01-04');
	});

	it('lists overdue and soon-due duties, soonest first', async () => {
		const result = await read<{
			obligations: { title: string; overdue: boolean; record: string }[];
		}>('records.upcoming', { days: 30 });
		expect(result.obligations.map((o) => o.title)).toEqual([
			'Overdue tyres',
			'Plain duty',
			'Inspection',
		]);
		expect(result.obligations[0]).toMatchObject({ overdue: true, record: 'Clio' });
		expect(result.obligations[1]?.overdue).toBe(false);
		const defaulted = await read<{ obligations: unknown[] }>('records.upcoming', {});
		expect(defaulted.obligations).toHaveLength(3);
	});

	it('leaves out the duties of an area the AI may not use', async () => {
		await k.runner.invoke(
			'core.setAiAreaAccess',
			{ extensionId: 'vehicles', access: 'off' },
			admin.actor,
		);
		const result = await read<{ obligations: { title: string }[] }>('records.upcoming', {
			days: 30,
		});
		expect(result.obligations.map((o) => o.title)).toEqual(['Plain duty']);
		// People still see them.
		const mine = await k
			.route('records.listUpcoming')
			.call({ query: { days: 30 }, actor: admin.actor });
		expect(mine).toHaveLength(3);
	});
});
