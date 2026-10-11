import type { DbExecutor, Migrations } from '@famos/sdk';
import { sql } from 'kysely';

/** Tables of the email adapter (migration scope `email`). */
export type EmailTables = {
	/** At most one row (`id = 1`). */
	email_settings: {
		id: number;
		host: string;
		port: number;
		/** Always 1: there is no plaintext option. */
		tls_required: number;
		username: string;
		/** The mailbox password, sealed with the SecretBox. */
		password: string;
		mailbox: string;
		processed_folder: string;
		poll_minutes: number;
		enabled: number;
		/** `ok` or the failure code of the last check; null until the first check. */
		status_code: string | null;
		status_text: string | null;
		last_checked_at: number | null;
		updated_at: number;
	};
	/** Who may send mail into the Inbox, and whose Inbox item it becomes. */
	email_senders: {
		/** Lowercase. */
		address: string;
		member_id: string;
		label: string | null;
		created_at: number;
	};
	/** Messages looked at, so nothing is processed twice (UIDVALIDITY + UID, and Message-ID). */
	email_seen: {
		uidvalidity: number;
		uid: number;
		message_id: string | null;
		/** `processed`, `unknown_sender`, `refused` (failed SPF/DKIM, too big, unreadable). */
		outcome: string;
		processed_at: number;
	};
};

export const emailTables = (db: DbExecutor) => db.withTables<EmailTables>();

export const emailMigrations: Migrations = {
	'0001_init': {
		async up(db) {
			await db.schema
				.createTable('email_settings')
				.addColumn('id', 'integer', (c) => c.primaryKey().check(sql`id = 1`))
				.addColumn('host', 'text', (c) => c.notNull())
				.addColumn('port', 'integer', (c) => c.notNull())
				.addColumn('tls_required', 'integer', (c) =>
					c.notNull().defaultTo(1).check(sql`tls_required = 1`),
				)
				.addColumn('username', 'text', (c) => c.notNull())
				.addColumn('password', 'text', (c) => c.notNull())
				.addColumn('mailbox', 'text', (c) => c.notNull().defaultTo('INBOX'))
				.addColumn('processed_folder', 'text', (c) => c.notNull().defaultTo('FamilyOS'))
				.addColumn('poll_minutes', 'integer', (c) =>
					c.notNull().defaultTo(5).check(sql`poll_minutes >= 2`),
				)
				.addColumn('enabled', 'integer', (c) => c.notNull().defaultTo(0))
				.addColumn('status_code', 'text')
				.addColumn('status_text', 'text')
				.addColumn('last_checked_at', 'integer')
				.addColumn('updated_at', 'integer', (c) => c.notNull())
				.modifyEnd(sql`strict`)
				.execute();
			await db.schema
				.createTable('email_senders')
				.addColumn('address', 'text', (c) => c.primaryKey())
				.addColumn('member_id', 'text', (c) => c.notNull())
				.addColumn('label', 'text')
				.addColumn('created_at', 'integer', (c) => c.notNull())
				.modifyEnd(sql`strict`)
				.execute();
			await db.schema
				.createTable('email_seen')
				.addColumn('uidvalidity', 'integer', (c) => c.notNull())
				.addColumn('uid', 'integer', (c) => c.notNull())
				.addColumn('message_id', 'text')
				.addColumn('outcome', 'text', (c) => c.notNull())
				.addColumn('processed_at', 'integer', (c) => c.notNull())
				.addPrimaryKeyConstraint('email_seen_pk', ['uidvalidity', 'uid'])
				.modifyEnd(sql`strict`)
				.execute();
			await db.schema
				.createIndex('email_seen_message_idx')
				.on('email_seen')
				.columns(['message_id'])
				.execute();
		},
	},
};
