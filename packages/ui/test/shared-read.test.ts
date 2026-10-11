import { afterEach, describe, expect, it, vi } from 'vitest';
import { forgetSharedReads, sharedRead } from '../src/famos/shared-read.js';

/** A read that answers when told to, counting how often it was started. */
function controlled<T>(value: T) {
	let started = 0;
	let answer: () => void = () => {};
	const read = () => {
		started++;
		return new Promise<T>((resolve) => {
			answer = () => resolve(value);
		});
	};
	return { read, answer: () => answer(), started: () => started };
}

describe('sharedRead', () => {
	afterEach(() => forgetSharedReads());

	it('joins a read that is on its way, and gives each caller its own copy', async () => {
		const r = controlled({ items: [1, 2] });
		const a = sharedRead('/x', r.read);
		const b = sharedRead('/x', r.read);
		r.answer();
		const [first, second] = await Promise.all([a, b]);
		expect(r.started()).toBe(1);
		expect(first).toEqual({ items: [1, 2] });
		first.items.push(3);
		expect(second.items).toEqual([1, 2]);
	});

	it('gives a late opener the answer for a moment, then reads again (never a cache)', async () => {
		vi.useFakeTimers();
		try {
			const r = controlled('v');
			const first = sharedRead('/y', r.read);
			r.answer();
			await first;
			await expect(sharedRead('/y', r.read)).resolves.toBe('v');
			expect(r.started()).toBe(1);
			await vi.advanceTimersByTimeAsync(2001);
			const again = sharedRead('/y', r.read);
			r.answer();
			await again;
			expect(r.started()).toBe(2);
		} finally {
			vi.useRealTimers();
		}
	});

	it('keeps different keys apart', async () => {
		const r = controlled(0);
		const a = sharedRead('/z?days=1', r.read);
		r.answer();
		const b = sharedRead('/z?days=2', r.read);
		r.answer();
		await Promise.all([a, b]);
		expect(r.started()).toBe(2);
	});

	it('starts afresh after a change on the server', async () => {
		const r = controlled('v');
		const before = sharedRead('/w', r.read);
		forgetSharedReads();
		const after = sharedRead('/w', r.read);
		r.answer();
		await after;
		expect(r.started()).toBe(2);
		void before;
	});

	it('reads again after a change even within the moment', async () => {
		const r = controlled('v');
		const first = sharedRead('/v', r.read);
		r.answer();
		await first;
		forgetSharedReads();
		const after = sharedRead('/v', r.read);
		r.answer();
		await after;
		expect(r.started()).toBe(2);
	});

	it('passes a failure to everyone who joined, then reads again', async () => {
		let started = 0;
		const failing = () => {
			started++;
			return Promise.reject(new Error('offline'));
		};
		await expect(
			Promise.all([sharedRead('/f', failing), sharedRead('/f', failing)]),
		).rejects.toThrow('offline');
		await expect(sharedRead('/f', failing)).rejects.toThrow('offline');
		expect(started).toBe(2);
	});
});
