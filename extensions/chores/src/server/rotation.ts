import type { Rotation } from '../contract/index.ts';

/**
 * Who is up after a chore is done. Pure, so the three strategies are easy to test.
 * - `fixed`: whoever is up stays (the first person when nobody is yet);
 * - `round_robin`: the next person in the list after the one who did it (after the one who was
 *   up, when the doer is not in the list); the last wraps to the first;
 * - `least_done`: the person with the fewest completions in the counting window, ties by position.
 * With nobody in the list, anyone may do it (null).
 */
export function nextAssignee(input: {
	rotation: Rotation;
	/** The people in rotation order. */
	order: readonly string[];
	/** Who was up. */
	current: string | null;
	/** Who did it. */
	doneBy: string | null;
	/** Completions in the window, per person, including the one just done. */
	counts: ReadonlyMap<string, number>;
}): string | null {
	const { rotation, order, current, doneBy, counts } = input;
	if (order.length === 0) return null;
	if (rotation === 'fixed')
		return current && order.includes(current) ? current : (order[0] ?? null);
	if (rotation === 'round_robin') {
		const from = doneBy && order.includes(doneBy) ? doneBy : current;
		const index = from ? order.indexOf(from) : -1;
		return order[(index + 1) % order.length] ?? null;
	}
	let best: string | null = null;
	let fewest = Number.POSITIVE_INFINITY;
	for (const member of order) {
		const done = counts.get(member) ?? 0;
		if (done < fewest) {
			fewest = done;
			best = member;
		}
	}
	return best;
}
