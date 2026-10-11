import { type DbExecutor, defineAction, defineRoute, type FamilyReader } from '@famos/sdk';
import { dayBounds, todayIn } from '@famos/time';
import { z } from 'zod';
import { TodayByMemberSchema, type TodayChores } from '../contract/index.ts';
import { choresView } from './capabilities.ts';
import { tables } from './store.ts';

/**
 * Today's chores per person, for the rings on Today and on displays. A chore counts for today when
 * it is due today or late (open, for whoever is up now), or when it was done today (for whoever's
 * turn it was). "Today" is the family's day, in the family time zone. A chore held by someone who
 * is no longer in the family counts for anyone. Only people with something today are listed, in
 * the family's order, and anyone last; an empty list means nothing today.
 */
export async function todayByMember(
	db: DbExecutor,
	family: FamilyReader,
	now: number,
): Promise<TodayChores[]> {
	const [{ timeZone }, members] = await Promise.all([family.settings(), family.members()]);
	const today = todayIn(timeZone, now);
	const { start, end } = dayBounds(today, timeZone);
	const t = tables(db);
	const [open, done] = await Promise.all([
		t
			.selectFrom('chores_chores')
			.select('assignee_id')
			.where('archived_at', 'is', null)
			.where('next_due', 'is not', null)
			.where('next_due', '<=', today)
			.execute(),
		t
			.selectFrom('chores_completions as d')
			.innerJoin('chores_chores as c', 'c.id', 'd.chore_id')
			.select('d.prev_assignee_id')
			.where('c.archived_at', 'is', null)
			.where('d.undone_at', 'is', null)
			.where('d.done_at', '>=', start)
			.where('d.done_at', '<', end)
			.execute(),
	]);

	const known = new Set(members.map((m) => m.id));
	const bucket = (id: string | null) => (id !== null && known.has(id) ? id : null);
	const counts = new Map<string | null, { done: number; total: number }>();
	const add = (id: string | null, isDone: boolean) => {
		const key = bucket(id);
		const entry = counts.get(key) ?? { done: 0, total: 0 };
		entry.total++;
		if (isDone) entry.done++;
		counts.set(key, entry);
	};
	for (const row of open) add(row.assignee_id, false);
	for (const row of done) add(row.prev_assignee_id, true);

	const order: (string | null)[] = [...members.map((m) => m.id), null];
	return order.flatMap((memberId) => {
		const entry = counts.get(memberId);
		return entry ? [{ memberId, ...entry }] : [];
	});
}

/** For members. It is not offered to the AI (no `ai` hints), so it returns member ids, not handles. */
export const todayByMemberAction = defineAction({
	id: 'chores.todayByMember',
	title: "Today's chores per person",
	description:
		'For each person with chores today, and for anyone, how many are due today or late and how many are done.',
	input: z.object({}),
	output: TodayByMemberSchema,
	readOnly: true,
	requires: choresView.id,
	async run(uow) {
		return todayByMember(uow.db, uow.family, uow.clock.now());
	},
});

/** The same for displays, which may read but never run an action. */
export const getTodayByMember = defineRoute({
	method: 'get',
	path: '/today',
	operationId: 'chores.getTodayByMember',
	summary: "Today's chores per person: due today or late, and done today",
	requires: choresView.id,
	response: TodayByMemberSchema,
	async handle(ctx) {
		return todayByMember(ctx.db, ctx.family, ctx.clock.now());
	},
});
