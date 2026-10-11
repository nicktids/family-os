import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AI, at, createKernel, person } from './support.ts';

let k: Awaited<ReturnType<typeof createKernel>>;
beforeEach(async () => {
	k = await createKernel();
	// Sunday 11 October, after the Saturday the dinner was suggested for.
	k.clock.set(at('2026-10-11', '09:00'));
});
afterEach(() => k.close());

const suggest = async (date: string) => {
	const result = await k.runner.invoke(
		'kitchen.addToMealPlan',
		{ date, slot: 'dinner', title: 'Lentil soup' },
		AI,
		{ draft: { sourceKind: 'assistant', sourceId: `msg_${date}` } },
	);
	if (result.status !== 'drafted') throw new Error('expected a draft');
	return result.draftId;
};

describe('a meal suggestion for a day that has passed', () => {
	it('is not listed before the job, is expired by it, and today’s stays', async () => {
		const parent = await person(k, 'admin');
		const saturday = await suggest('2026-10-10');
		const sunday = await suggest('2026-10-11');
		const pending = async () =>
			(
				(await k.route('core.listDrafts').call({
					query: { status: 'pending', limit: 50 },
					actor: parent.actor,
				})) as { id: string }[]
			).map((d) => d.id);

		expect(await pending()).toEqual([sunday]);
		expect((await k.route('core.countWaitingDrafts').call({ actor: parent.actor })).count).toBe(1);

		expect(await k.runner.expirePassed()).toBe(1);
		expect(await k.runner.expirePassed()).toBe(0);
		const all = (await k.route('core.listDrafts').call({
			query: { limit: 50 },
			actor: parent.actor,
		})) as { id: string; status: string }[];
		expect(Object.fromEntries(all.map((d) => [d.id, d.status]))).toEqual({
			[sunday]: 'pending',
			[saturday]: 'expired',
		});
		expect(await pending()).toEqual([sunday]);
	});
});
