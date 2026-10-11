import type { Migrations } from '@famos/sdk';
import { describe, expect, it } from 'vitest';
import { openDatabase } from '../src/connection.ts';
import {
	OutOfOrderMigrationError,
	planMigrations,
	runMigrations,
	SchemaNewerThanCodeError,
	schemaState,
} from '../src/migrator.ts';

const createTable = (name: string) => ({
	up: async (db: Parameters<Migrations[string]['up']>[0]) => {
		await db.schema
			.createTable(name)
			.addColumn('id', 'text', (c) => c.primaryKey())
			.execute();
	},
});

describe('migrator', () => {
	it('applies pending migrations once, in name order', async () => {
		const { db } = openDatabase({ path: ':memory:' });
		const scopes = [
			{ scope: 'core', migrations: { '0002_b': createTable('b'), '0001_a': createTable('a') } },
		];
		const first = await runMigrations(db, scopes);
		expect(first.pending.map((p) => p.name)).toEqual(['0001_a', '0002_b']);
		const second = await runMigrations(db, scopes);
		expect(second.pending).toEqual([]);
		expect(await schemaState(db)).toEqual({ core: ['0001_a', '0002_b'] });
	});

	it('refuses a database with migrations unknown to the code', async () => {
		const { db } = openDatabase({ path: ':memory:' });
		await runMigrations(db, [
			{ scope: 'core', migrations: { '0001_a': createTable('a'), '0002_b': createTable('b') } },
		]);
		await expect(
			planMigrations(db, [{ scope: 'core', migrations: { '0001_a': createTable('a') } }]),
		).rejects.toBeInstanceOf(SchemaNewerThanCodeError);
	});

	it('leaves the scope of an extension that is no longer installed alone', async () => {
		const { db } = openDatabase({ path: ':memory:' });
		await runMigrations(db, [{ scope: 'removed', migrations: { '0001_a': createTable('a') } }]);
		const plan = await runMigrations(db, [
			{ scope: 'core', migrations: { '0001_b': createTable('b') } },
		]);
		expect(plan.pending.map((p) => `${p.scope}/${p.name}`)).toEqual(['core/0001_b']);
		expect(plan.orphaned).toEqual([{ scope: 'removed', names: ['0001_a'] }]);
		// Its record and its table stay, so installing it again finds its data.
		expect(await schemaState(db)).toEqual({ core: ['0001_b'], removed: ['0001_a'] });
	});

	it('refuses a new migration that sorts before an applied one', async () => {
		const { db } = openDatabase({ path: ':memory:' });
		await runMigrations(db, [{ scope: 'core', migrations: { '0002_b': createTable('b') } }]);
		await expect(
			planMigrations(db, [
				{ scope: 'core', migrations: { '0001_a': createTable('a'), '0002_b': createTable('b') } },
			]),
		).rejects.toBeInstanceOf(OutOfOrderMigrationError);
	});

	it('rolls back a failing migration and records nothing', async () => {
		const { db } = openDatabase({ path: ':memory:' });
		const failing = {
			up: async (trx: Parameters<Migrations[string]['up']>[0]) => {
				await trx.schema.createTable('half').addColumn('id', 'text').execute();
				throw new Error('boom');
			},
		};
		await expect(
			runMigrations(db, [{ scope: 'core', migrations: { '0001_fail': failing } }]),
		).rejects.toThrow('boom');
		expect(await schemaState(db)).toEqual({});
		const tables = await db.introspection.getTables();
		expect(tables.map((t) => t.name)).not.toContain('half');
	});
});
