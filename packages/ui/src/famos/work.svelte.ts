/**
 * Work that leads to a page's first data, besides the reads themselves: a navigation on its
 * way, the code of a lazy component, the body of an answer being read. A page's next read only
 * starts once such work is done, so the page gate (in the app) counts it with the reads: while
 * anything is pending here, the page is not done opening.
 *
 * Work ends a macrotask after it settles, so what the settled work starts (a read, the next
 * component) is counted before this work stops counting: there is no gap between the two.
 */
class PendingWork {
	/** How much work is pending (reactive). */
	current = $state(0);
}

export const pendingWork = new PendingWork();

let count = 0;
let scheduled = false;

// The reactive count is written after the current task's microtasks start, never inside the
// effect or template expression that begins the work (Svelte forbids writing state there).
function publish(): void {
	if (scheduled) return;
	scheduled = true;
	queueMicrotask(() => {
		scheduled = false;
		pendingWork.current = count;
	});
}

/** Starts a piece of work; call the returned function (once or more) when it is done. */
export function beginWork(): () => void {
	count++;
	publish();
	let ended = false;
	return () => {
		if (ended) return;
		ended = true;
		setTimeout(() => {
			count--;
			publish();
		}, 0);
	};
}

/** Counts a promise as work until it settles, and returns it unchanged. */
export function trackWork<T>(promise: Promise<T>): Promise<T> {
	const end = beginWork();
	promise.then(end, end);
	return promise;
}
