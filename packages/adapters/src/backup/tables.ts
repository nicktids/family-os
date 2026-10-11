import type { DbExecutor, Migrations } from '@famos/sdk';
import { sql } from 'kysely';

/** Tables of the backup adapter (migration scope `backup`). */
export type BackupTables = {
	/** At most one row (`id = 1`). No row means encryption was never chosen: nothing is uploaded. */
	backup_settings: {
		id: number;
		encryption_mode: 'passphrase' | 'recipient' | 'none';
		/** The passphrase, sealed with the SecretBox (`passphrase` mode only). */
		sealed_passphrase: string | null;
		/** An `age1…` public key (`recipient` mode only). */
		recipient: string | null;
		updated_at: number;
	};
	backup_targets: {
		id: string;
		kind: 's3' | 'webdav';
		name: string;
		/** The target's configuration as JSON, sealed with the SecretBox (it holds credentials). */
		config: string;
		/** How many of our backup files the target keeps. */
		keep: number;
		enabled: number;
		last_run_at: number | null;
		/** `ok` or a short code such as `http_403`; never a message with URLs or credentials. */
		last_result: string | null;
		last_size: number | null;
		created_at: number;
	};
};

export const backupTables = (db: DbExecutor) => db.withTables<BackupTables>();

export const backupMigrations: Migrations = {
	'0001_init': {
		async up(db) {
			await db.schema
				.createTable('backup_settings')
				.addColumn('id', 'integer', (c) => c.primaryKey().check(sql`id = 1`))
				.addColumn('encryption_mode', 'text', (c) =>
					c.notNull().check(sql`encryption_mode in ('passphrase', 'recipient', 'none')`),
				)
				.addColumn('sealed_passphrase', 'text')
				.addColumn('recipient', 'text')
				.addColumn('updated_at', 'integer', (c) => c.notNull())
				.modifyEnd(sql`strict`)
				.execute();
			await db.schema
				.createTable('backup_targets')
				.addColumn('id', 'text', (c) => c.primaryKey())
				.addColumn('kind', 'text', (c) => c.notNull().check(sql`kind in ('s3', 'webdav')`))
				.addColumn('name', 'text', (c) => c.notNull())
				.addColumn('config', 'text', (c) => c.notNull())
				.addColumn('keep', 'integer', (c) => c.notNull().defaultTo(7))
				.addColumn('enabled', 'integer', (c) => c.notNull().defaultTo(1))
				.addColumn('last_run_at', 'integer')
				.addColumn('last_result', 'text')
				.addColumn('last_size', 'integer')
				.addColumn('created_at', 'integer', (c) => c.notNull())
				.modifyEnd(sql`strict`)
				.execute();
		},
	},
};
