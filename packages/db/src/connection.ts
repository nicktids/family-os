import type { DbExecutor } from '@famos/sdk';
import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';

export interface OpenDatabaseOptions {
	/** File path, or ':memory:' for tests. */
	path: string;
	readonly?: boolean;
}

export interface DatabaseHandle {
	readonly db: DbExecutor;
	/** The raw driver, for backups and pragmas. Do not use for queries. */
	readonly sqlite: Database.Database;
	close(): Promise<void>;
}

/**
 * Opens the SQLite database in WAL mode with foreign keys on and a busy timeout.
 * better-sqlite3 is synchronous and Kysely's SqliteDialect serializes access
 * over one connection, which gives us the single-writer model for free.
 */
export function openDatabase(options: OpenDatabaseOptions): DatabaseHandle {
	const sqlite = new Database(options.path, { readonly: options.readonly ?? false });
	if (options.path !== ':memory:') sqlite.pragma('journal_mode = WAL');
	sqlite.pragma('synchronous = NORMAL');
	sqlite.pragma('foreign_keys = ON');
	sqlite.pragma('busy_timeout = 5000');

	const db: DbExecutor = new Kysely({ dialect: new SqliteDialect({ database: sqlite }) });
	return {
		db,
		sqlite,
		close: () => db.destroy(),
	};
}
