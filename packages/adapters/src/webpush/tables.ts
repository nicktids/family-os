import type { DbExecutor, Migrations } from '@famos/sdk';
import { sql } from 'kysely';

/** Tables of the Web Push adapter (migration scope `webpush`). */
export type WebPushTables = {
	/** At most one row (`id = 1`): the VAPID key pair, generated once and never rotated. */
	webpush_keys: {
		id: number;
		/** Uncompressed P-256 point, base64url. */
		public_key: string;
		/** Sealed with the SecretBox. */
		private_key: string;
		created_at: number;
	};
	webpush_subscriptions: {
		id: string;
		member_id: string;
		endpoint: string;
		p256dh: string;
		auth: string;
		label: string;
		created_at: number;
		last_success_at: number | null;
	};
};

export const webPushTables = (db: DbExecutor) => db.withTables<WebPushTables>();

export const webPushMigrations: Migrations = {
	'0001_init': {
		async up(db) {
			await db.schema
				.createTable('webpush_keys')
				.addColumn('id', 'integer', (c) => c.primaryKey().check(sql`id = 1`))
				.addColumn('public_key', 'text', (c) => c.notNull())
				.addColumn('private_key', 'text', (c) => c.notNull())
				.addColumn('created_at', 'integer', (c) => c.notNull())
				.modifyEnd(sql`strict`)
				.execute();
			await db.schema
				.createTable('webpush_subscriptions')
				.addColumn('id', 'text', (c) => c.primaryKey())
				.addColumn('member_id', 'text', (c) => c.notNull())
				.addColumn('endpoint', 'text', (c) => c.notNull().unique())
				.addColumn('p256dh', 'text', (c) => c.notNull())
				.addColumn('auth', 'text', (c) => c.notNull())
				.addColumn('label', 'text', (c) => c.notNull())
				.addColumn('created_at', 'integer', (c) => c.notNull())
				.addColumn('last_success_at', 'integer')
				.modifyEnd(sql`strict`)
				.execute();
			await db.schema
				.createIndex('webpush_subscriptions_member_idx')
				.on('webpush_subscriptions')
				.columns(['member_id'])
				.execute();
		},
	},
};
