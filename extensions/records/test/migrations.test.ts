import { openDatabase, runMigrations } from '@famos/testing';
import { sql } from 'kysely';
import { expect, it } from 'vitest';
import { migrations } from '../src/server/store.ts';

it('gives obligations a lapses column that is off unless set', async () => {
	const handle = openDatabase({ path: ':memory:' });
	const { db } = handle;
	await runMigrations(db, [{ scope: 'records', migrations }]);
	await sql`insert into records_obligations
		(id, record_id, record_kind, record_name, kind, title, due_date, created_at, updated_at)
		values ('obligation_a', 'x', 'vehicle', 'X', 'custom', 'T', '2026-04-12', 1, 1)`.execute(db);
	const rows = (
		await sql<{ id: string; lapses: number }>`select id, lapses from records_obligations`.execute(
			db,
		)
	).rows;
	expect(rows).toEqual([{ id: 'obligation_a', lapses: 0 }]);
	await handle.close();
});
