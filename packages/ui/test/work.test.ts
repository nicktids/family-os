import { afterEach, describe, expect, it, vi } from 'vitest';
import { openPath } from '../src/famos/open-path.js';
import { beginWork, pendingWork, trackWork } from '../src/famos/work.svelte.js';

/** Lets the microtasks run, which is when the reactive count is written. */
const flush = () => vi.advanceTimersByTimeAsync(0);

describe('pendingWork', () => {
	afterEach(() => vi.useRealTimers());

	it('counts work from its start until a macrotask after it ends', async () => {
		vi.useFakeTimers();
		const end = beginWork();
		await Promise.resolve();
		expect(pendingWork.current).toBe(1);
		end();
		// Still counted in the same task: what the work starts next is counted before it stops.
		await Promise.resolve();
		expect(pendingWork.current).toBe(1);
		await flush();
		expect(pendingWork.current).toBe(0);
	});

	it('ends a piece of work only once', async () => {
		vi.useFakeTimers();
		const a = beginWork();
		const b = beginWork();
		a();
		a();
		await flush();
		expect(pendingWork.current).toBe(1);
		b();
		await flush();
		expect(pendingWork.current).toBe(0);
	});

	it('tracks a promise until it settles, either way, and returns it unchanged', async () => {
		vi.useFakeTimers();
		let resolve: (value: string) => void = () => {};
		let reject: (error: Error) => void = () => {};
		const ok = new Promise<string>((r) => {
			resolve = r;
		});
		const failing = new Promise<string>((_, r) => {
			reject = r;
		});
		expect(trackWork(ok)).toBe(ok);
		const tracked = trackWork(failing);
		await flush();
		expect(pendingWork.current).toBe(2);
		resolve('done');
		reject(new Error('no'));
		await expect(ok).resolves.toBe('done');
		await expect(tracked).rejects.toThrow('no');
		await flush();
		expect(pendingWork.current).toBe(0);
	});

	it('lets work started by settled work keep the count above zero', async () => {
		vi.useFakeTimers();
		const seen: number[] = [];
		const first = trackWork(Promise.resolve());
		let next: (() => void) | undefined;
		void first.then(() => {
			next = beginWork();
		});
		for (let i = 0; i < 3; i++) {
			await flush();
			seen.push(pendingWork.current);
		}
		expect(seen.every((n) => n > 0)).toBe(true);
		next?.();
		await flush();
		expect(pendingWork.current).toBe(0);
	});

	it('counts opening a path as work until the router has had its frame to start the navigation', async () => {
		vi.useFakeTimers();
		const clicked: string[] = [];
		const onClick = (event: Event) => {
			event.preventDefault();
			clicked.push((event.target as HTMLAnchorElement).getAttribute('href') ?? '');
		};
		document.addEventListener('click', onClick);
		try {
			openPath('/pets/1', { replace: true });
			expect(clicked).toEqual(['/pets/1']);
			// The request that led here ends now; the page must not look done before the next frame.
			await flush();
			expect(pendingWork.current).toBe(1);
			await vi.advanceTimersByTimeAsync(5);
			expect(pendingWork.current).toBe(1);
			await vi.advanceTimersByTimeAsync(120);
			expect(pendingWork.current).toBe(0);
		} finally {
			document.removeEventListener('click', onClick);
		}
	});
});
