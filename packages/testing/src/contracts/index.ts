import { type DbExecutor, type FileStore, type JobQueue, LlmError, type LlmPort } from '@famos/sdk';
import { describe, expect, it } from 'vitest';

/**
 * Port contract suites. Every adapter (and fake) for a port must pass its suite; this is what
 * "swappable" means in FamilyOS .
 */

export interface QueueHarness {
	queue: JobQueue;
	db: DbExecutor;
	advance(ms: number): void;
	close(): Promise<void>;
}

export function jobQueueContract(name: string, make: () => Promise<QueueHarness>): void {
	describe(`JobQueue contract: ${name}`, () => {
		it('enqueues and claims due jobs in order, once', async () => {
			const h = await make();
			const a = await h.queue.enqueue(h.db, 'test.a', { n: 1 });
			const b = await h.queue.enqueue(h.db, 'test.a', { n: 2 });
			const first = await h.queue.claim(['test.a'], 1000);
			const second = await h.queue.claim(['test.a'], 1000);
			expect([first?.id, second?.id]).toEqual([a, b]);
			expect(first?.payload).toEqual({ n: 1 });
			expect(first?.attempt).toBe(1);
			expect(await h.queue.claim(['test.a'], 1000)).toBeUndefined();
			await h.close();
		});

		it('only claims jobs with the requested names', async () => {
			const h = await make();
			await h.queue.enqueue(h.db, 'test.other', {});
			expect(await h.queue.claim(['test.a'], 1000)).toBeUndefined();
			await h.close();
		});

		it('respects runAt', async () => {
			const h = await make();
			await h.queue.enqueue(h.db, 'test.a', {}, { runAt: Number.MAX_SAFE_INTEGER });
			expect(await h.queue.claim(['test.a'], 1000)).toBeUndefined();
			await h.close();
		});

		it('deduplicates pending jobs by key', async () => {
			const h = await make();
			const a = await h.queue.enqueue(h.db, 'test.a', {}, { dedupeKey: 'k' });
			const b = await h.queue.enqueue(h.db, 'test.a', {}, { dedupeKey: 'k' });
			expect(b).toBe(a);
			const job = await h.queue.claim(['test.a'], 1000);
			if (!job) throw new Error('expected a job');
			await h.queue.complete(job.id);
			const c = await h.queue.enqueue(h.db, 'test.a', {}, { dedupeKey: 'k' });
			expect(c).not.toBe(a);
			await h.close();
		});

		it('retries failed jobs at retryAt and marks them dead after maxAttempts', async () => {
			const h = await make();
			await h.queue.enqueue(h.db, 'test.a', {}, { maxAttempts: 2 });
			const first = await h.queue.claim(['test.a'], 1000);
			if (!first) throw new Error('expected a job');
			expect(await h.queue.fail(first.id, 'boom', Number.MAX_SAFE_INTEGER)).toBe('failed');
			expect(await h.queue.claim(['test.a'], 1000)).toBeUndefined();

			await h.queue.fail(first.id, 'boom', 0); // make it due again
			const second = await h.queue.claim(['test.a'], 1000);
			expect(second?.attempt).toBe(2);
			if (!second) throw new Error('expected a retry');
			expect(await h.queue.fail(second.id, 'boom again', 0)).toBe('dead');
			expect(await h.queue.claim(['test.a'], 1000)).toBeUndefined();
			await h.close();
		});

		it('recovers expired leases', async () => {
			const h = await make();
			await h.queue.enqueue(h.db, 'test.a', {});
			const job = await h.queue.claim(['test.a'], 1000);
			expect(job).toBeDefined();
			expect(await h.queue.recoverExpired()).toBe(0);
			h.advance(1001);
			expect(await h.queue.recoverExpired()).toBe(1);
			const again = await h.queue.claim(['test.a'], 1000);
			expect(again?.id).toBe(job?.id);
			expect(again?.attempt).toBe(2);
			await h.close();
		});

		it('enqueues inside a transaction that can roll back', async () => {
			const h = await make();
			await expect(
				h.db.transaction().execute(async (trx) => {
					await h.queue.enqueue(trx, 'test.a', {});
					throw new Error('rollback');
				}),
			).rejects.toThrow('rollback');
			expect(await h.queue.claim(['test.a'], 1000)).toBeUndefined();
			await h.close();
		});
	});
}

export function fileStoreContract(name: string, make: () => Promise<FileStore>): void {
	const bytes = (s: string) => new TextEncoder().encode(s);
	const collect = async (stream: AsyncIterable<Uint8Array>) => {
		const chunks: Uint8Array[] = [];
		for await (const chunk of stream) chunks.push(chunk);
		return new TextDecoder().decode(Buffer.concat(chunks));
	};

	describe(`FileStore contract: ${name}`, () => {
		it('stores bytes and streams with content type', async () => {
			const store = await make();
			const stat = await store.put('inbox/a.txt', bytes('hello'), 'text/plain');
			expect(stat).toEqual({ size: 5, contentType: 'text/plain' });
			async function* gen() {
				yield bytes('str');
				yield bytes('eam');
			}
			await store.put('inbox/b.txt', gen());
			const a = await store.get('inbox/a.txt');
			expect(a && (await collect(a.stream))).toBe('hello');
			const b = await store.get('inbox/b.txt');
			expect(b && (await collect(b.stream))).toBe('stream');
		});

		it('returns null for missing files and deletes idempotently', async () => {
			const store = await make();
			expect(await store.get('missing.txt')).toBeNull();
			expect(await store.stat('missing.txt')).toBeNull();
			await store.put('x.txt', bytes('x'));
			await store.delete('x.txt');
			await store.delete('x.txt');
			expect(await store.stat('x.txt')).toBeNull();
		});

		it('rejects keys that escape the store', async () => {
			const store = await make();
			await expect(store.put('../evil', bytes('x'))).rejects.toThrow();
			await expect(store.put('/abs', bytes('x'))).rejects.toThrow();
		});
	});
}

/** An `LlmPort` whose `embed` role is set up (a real adapter against a stand-in server, or the fake). */
export interface EmbeddingHarness {
	llm: LlmPort;
	/** Makes the `embed` role unset, so calls fail as "not configured". */
	unset(): Promise<void>;
	/** Turns the area off for the AI. */
	closeArea(area: string): Promise<void>;
}

export function embeddingContract(name: string, make: () => Promise<EmbeddingHarness>): void {
	describe(`LlmPort.embed contract: ${name}`, () => {
		const call = (llm: LlmPort, texts: string[], area = 'test') =>
			llm.embed({ feature: 'test.embed', area, texts, timeoutMs: 5_000 });

		it('returns one vector of the same length per text, and a model key', async () => {
			const { llm } = await make();
			const result = await call(llm, ['boiler warranty', 'school trip', 'pasta']);
			expect(result.vectors).toHaveLength(3);
			expect(result.dimensions).toBeGreaterThan(0);
			for (const v of result.vectors) {
				expect(v).toBeInstanceOf(Float32Array);
				expect(v).toHaveLength(result.dimensions);
				expect([...v].every(Number.isFinite)).toBe(true);
			}
			expect(result.model).not.toBe('');
			expect((await llm.policy('test.embed', 'embed')).model).toBe(result.model);
		});

		it('gives the same vector for the same text', async () => {
			const { llm } = await make();
			const [a, b] = (await call(llm, ['same words', 'same words'])).vectors;
			expect([...(a as Float32Array)]).toEqual([...(b as Float32Array)]);
		});

		it('fails as not configured, without retry, when the role is unset', async () => {
			const h = await make();
			await h.unset();
			await expect(call(h.llm, ['x'])).rejects.toMatchObject({
				code: 'not_configured',
				retryable: false,
			});
			expect((await h.llm.policy('test.embed', 'embed')).model).toBeNull();
		});

		it('refuses an area that is off for the AI', async () => {
			const h = await make();
			await h.closeArea('secret');
			const error = await call(h.llm, ['x'], 'secret').catch((e: unknown) => e);
			expect(error).toBeInstanceOf(LlmError);
			expect(error).toMatchObject({ code: 'disabled', retryable: false });
		});
	});
}
