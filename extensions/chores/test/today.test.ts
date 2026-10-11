import type { Actor } from '@famos/sdk';
import type { TestKernel } from '@famos/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Chore, MarkDoneResult, TodayChores } from '../src/contract/index.ts';
import { applied, at, createKernel, mayCall, type Person, person } from './support.ts';

let k: TestKernel;
let ayse: Person; // admin
let bora: Person; // member
let elif: Person; // supervised

beforeEach(async () => {
	({ k } = await createKernel());
	ayse = await person(k, 'admin', 'Ayşe');
	bora = await person(k, 'member', 'Bora');
	elif = await person(k, 'supervised', 'Elif');
});
afterEach(() => k.close());

const TODAY = '2026-10-06';
const DAILY = { freq: 'daily', interval: 1 };
const create = (title: string, input: Record<string, unknown> = {}) =>
	applied<Chore>(
		k,
		'chores.createChore',
		{ title, startDate: TODAY, assigneeIds: [], ...input },
		ayse.actor,
	);
const done = (c: Chore, actor: Actor = ayse.actor) =>
	applied<MarkDoneResult>(k, 'chores.markDone', { id: c.id, dueDate: c.nextDue }, actor);
const today = (actor: Actor = ayse.actor) =>
	applied<TodayChores[]>(k, 'chores.todayByMember', {}, actor);
const display = (capabilities: string[]): Actor => ({
	kind: 'display',
	deviceId: 'dev_1',
	capabilities,
	showNames: true,
});

describe('chores today by member', () => {
	it('is empty when nothing is due today', async () => {
		expect(await today()).toEqual([]);
		await create('Windows', { startDate: '2026-10-07', assigneeIds: [ayse.id] });
		expect(await today()).toEqual([]);
	});

	it('counts what is due today or late per person, and anyone last', async () => {
		const dishes = await create('Dishes', { recurrence: DAILY, assigneeIds: [ayse.id] });
		await create('Bins', { assigneeIds: [bora.id] });
		await create('Plants', { startDate: '2026-10-04', assigneeIds: [bora.id] }); // late
		await create('Sweep'); // anyone
		await create('Windows', { startDate: '2026-10-07', assigneeIds: [ayse.id] }); // tomorrow
		const gone = await create('Gutters', { assigneeIds: [ayse.id] });
		await applied(k, 'chores.archiveChore', { id: gone.id }, ayse.actor);

		expect(await today()).toEqual([
			{ memberId: ayse.id, done: 0, total: 1 },
			{ memberId: bora.id, done: 0, total: 2 },
			{ memberId: null, done: 0, total: 1 },
		]);

		// Done today: the daily chore moved on to tomorrow, and still counts as today's.
		await done(dishes);
		expect((await today())[0]).toEqual({ memberId: ayse.id, done: 1, total: 1 });
	});

	it('counts a chore anyone may do for anyone, whoever did it, and forgets an undone one', async () => {
		const sweep = await create('Sweep', { recurrence: DAILY });
		const result = await done(sweep, elif.actor);
		expect(await today()).toEqual([{ memberId: null, done: 1, total: 1 }]);
		await applied(k, 'chores.undoDone', { completionId: result.completion?.id }, elif.actor);
		expect(await today()).toEqual([{ memberId: null, done: 0, total: 1 }]);
	});

	it("uses the family's day: yesterday's completions do not count", async () => {
		const dishes = await create('Dishes', { recurrence: DAILY, assigneeIds: [bora.id] });
		// 23:30 in Istanbul is still the 6th, though it is the 6th 20:30 UTC.
		k.clock.set(at(TODAY, '23:30'));
		await done(dishes, bora.actor);
		expect(await today()).toEqual([{ memberId: bora.id, done: 1, total: 1 }]);
		// 00:30 on the 7th in Istanbul (still the 6th in UTC): a new day, the chore is due again.
		k.clock.set(at('2026-10-07', '00:30'));
		expect(await today()).toEqual([{ memberId: bora.id, done: 0, total: 1 }]);
	});

	it('counts the chores of someone who left the family for anyone', async () => {
		await create('Bins', { assigneeIds: [bora.id] });
		await applied(k, 'core.archiveMember', { memberId: bora.id }, ayse.actor);
		expect(await today()).toEqual([{ memberId: null, done: 0, total: 1 }]);
	});

	it('needs chores.view; displays read it through the route, never the action', async () => {
		await create('Bins', { assigneeIds: [bora.id] });
		const guest = await person(k, 'guest', 'Misafir');
		expect(await today(guest.actor)).toEqual([{ memberId: bora.id, done: 0, total: 1 }]);
		expect(k.registry.actions.get('chores.todayByMember')?.requires).toBe('chores.view');
		expect(k.registry.actions.get('chores.todayByMember')?.readOnly).toBe(true);
		await expect(
			k.runner.invoke('chores.todayByMember', {}, display(['chores.view'])),
		).rejects.toMatchObject({ code: 'forbidden' });

		expect(mayCall(k, display(['chores.view']), 'chores.getTodayByMember')).toBe(true);
		expect(mayCall(k, display(['calendar.view']), 'chores.getTodayByMember')).toBe(false);
		expect(mayCall(k, guest.actor, 'chores.getTodayByMember')).toBe(true);
		expect(
			await k.route('chores.getTodayByMember').call({ actor: display(['chores.view']) }),
		).toEqual([{ memberId: bora.id, done: 0, total: 1 }]);
	});
});
