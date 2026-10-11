import { openDatabase, runMigrations } from '@famos/testing';
import { sql } from 'kysely';
import { expect, it } from 'vitest';
import { DEFAULT_LIST_ID, migrations } from '../src/server/store.ts';

it('a fresh database has the default list without a name, so screens show their own', async () => {
	const { db } = openDatabase({ path: ':memory:' });
	await runMigrations(db, [{ scope: 'lists', migrations }]);
	expect((await sql`select id, name from lists_shopping_lists`.execute(db)).rows).toEqual([
		{ id: DEFAULT_LIST_ID, name: '' },
	]);
});
