/**
 * One read for the parts of a page that open together. Today's cards, its timeline and its
 * weather each ask for some of the same data (the tasks, the day's events) as they open, and they
 * open over a moment: a card's code may arrive after the first answer did, on a busy device.
 * A read for `key` asked again while it is on its way, or within `GRACE_MS` of its answer, gets
 * that answer instead of reading twice.
 *
 * It never hides a change. The app calls `forgetSharedReads` on every event from the server
 * (every change sends one) and on every write it sends, before anything reloads, so a read asked
 * for after a change always reads again; past the grace it reads again anyway. Each caller gets
 * its own copy, so one cannot change what another holds.
 *
 * The key is the read's address (path and query), the same for every extension that reads it.
 */
const GRACE_MS = 2000;

const shared = new Map<string, Promise<unknown>>();

export function sharedRead<T>(key: string, read: () => Promise<T>): Promise<T> {
	let answer = shared.get(key) as Promise<T> | undefined;
	if (!answer) {
		const started = read();
		answer = started;
		shared.set(key, started);
		const forget = () => {
			if (shared.get(key) === started) shared.delete(key);
		};
		started.then(() => setTimeout(forget, GRACE_MS), forget);
	}
	return answer.then((value) => structuredClone(value));
}

/** Something changed (or is about to): reads asked for from now on start afresh. */
export function forgetSharedReads(): void {
	shared.clear();
}
