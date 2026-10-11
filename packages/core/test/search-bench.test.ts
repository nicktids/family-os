import { openDatabase, runMigrations } from '@famos/db';
import { expect, it } from 'vitest';
import { coreMigrations } from '../src/migrations/0001_init.ts';
import { dot, normalize, TopK } from '../src/search.ts';

/**
 * Performance guard for exact search in TypeScript: scores 50,000 random 768-d
 * vectors, as the search action does after loading them. Skipped unless FAMOS_BENCH=1:
 * `FAMOS_BENCH=1 pnpm vitest run packages/core/test/search-bench.test.ts`.
 */
it.skipIf(!process.env.FAMOS_BENCH)('scores 50,000 vectors of 768 dimensions', () => {
	const count = 50_000;
	const dimensions = 768;
	let seed = 12345;
	const random = () => {
		seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
		return seed / 2 ** 32 - 0.5;
	};
	const vectors: Float32Array[] = [];
	for (let i = 0; i < count; i++) {
		const v = new Float32Array(dimensions);
		for (let d = 0; d < dimensions; d++) v[d] = random();
		vectors.push(normalize(v));
	}
	const query = normalize(vectors[7] as Float32Array);

	const runs: number[] = [];
	let best: TopK<number> | undefined;
	for (let run = 0; run < 5; run++) {
		const top = new TopK<number>(50);
		const started = performance.now();
		for (let i = 0; i < count; i++) {
			const score = dot(query, vectors[i] as Float32Array);
			if (top.wants(score)) top.add(score, i);
		}
		runs.push(performance.now() - started);
		best = top;
	}
	console.log(
		`search benchmark: ${count} x ${dimensions}: ${runs.map((ms) => `${ms.toFixed(0)} ms`).join(', ')}`,
	);
	expect(best?.items[0]?.value).toBe(7);
	// A generous bound: the point is the printed number, this only catches an accident.
	expect(Math.min(...runs)).toBeLessThan(2_000);
});

/** The whole path: 50,000 stored chunks read from SQLite in pages, then scored. */
it.skipIf(!process.env.FAMOS_BENCH)('loads and scores 50,000 stored vectors', async () => {
	const count = 50_000;
	const dimensions = 768;
	const { db } = openDatabase({ path: ':memory:' });
	await runMigrations(db, [{ scope: 'core', migrations: coreMigrations }]);
	const table = db.withTables<{
		core_embeddings: Record<string, string | number | Uint8Array | null>;
	}>();
	let seed = 99;
	const random = () => {
		seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
		return seed / 2 ** 32 - 0.5;
	};
	for (let from = 0; from < count; from += 500) {
		const batch = [];
		for (let i = from; i < Math.min(count, from + 500); i++) {
			const v = new Float32Array(dimensions);
			for (let d = 0; d < dimensions; d++) v[d] = random();
			batch.push({
				id: `e_${String(i).padStart(6, '0')}`,
				extension_id: 'notes',
				source_kind: 'notes.note',
				source_id: `n_${i}`,
				capability: 'notes.view',
				owner_member_id: null,
				title: 'T',
				href: '/',
				snippet: 's',
				model: 'm',
				dimensions,
				text_hash: 'h',
				chunk_index: 0,
				vector: new Uint8Array(normalize(v).buffer),
				updated_at: 1,
			});
		}
		await table.insertInto('core_embeddings').values(batch).execute();
	}
	const query = normalize(Float32Array.from({ length: dimensions }, random));

	const runs: number[] = [];
	for (let run = 0; run < 3; run++) {
		const top = new TopK<string>(50);
		const started = performance.now();
		let last = '';
		for (;;) {
			const rows = await table
				.selectFrom('core_embeddings')
				.select(['id', 'vector'])
				.where('model', '=', 'm')
				.where('source_kind', 'in', ['notes.note'])
				.where('id', '>', last)
				.orderBy('id')
				.limit(2000)
				.execute();
			for (const row of rows) {
				const blob = row.vector as Uint8Array;
				const vector = new Float32Array(
					blob.buffer.slice(blob.byteOffset, blob.byteOffset + blob.byteLength),
				);
				const score = dot(query, vector);
				if (top.wants(score)) top.add(score, row.id as string);
			}
			if (rows.length < 2000) break;
			last = rows.at(-1)?.id as string;
		}
		runs.push(performance.now() - started);
	}
	console.log(
		`search benchmark with SQLite: ${count} x ${dimensions}: ${runs.map((ms) => `${ms.toFixed(0)} ms`).join(', ')}`,
	);
	expect(Math.min(...runs)).toBeLessThan(10_000);
});
