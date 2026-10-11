import type { DbExecutor, Migrations } from '@famos/sdk';
import { sql } from 'kysely';

/** Tables of the Telegram adapter (migration scope `telegram`). */
export type TelegramTables = {
	/** At most one row (`id = 1`). */
	telegram_settings: {
		id: number;
		/** The bot token, sealed with the SecretBox; null while no bot is connected. */
		bot_token: string | null;
		bot_id: number | null;
		bot_username: string | null;
		/** The `offset` for the next `getUpdates`: the last processed `update_id` plus one. */
		update_offset: number;
		/** `ok`, `conflict`, `invalid_token` or `offline`; null until the poller has run. */
		status_code: string | null;
		status_at: number | null;
		updated_at: number;
	};
	/** A member's Telegram account. Links are credentials: they let a chat act as the member. */
	telegram_links: {
		member_id: string;
		telegram_user_id: number;
		chat_id: number;
		username: string | null;
		linked_at: number;
		/** The member's assistant thread for questions typed in the chat. */
		thread_id: string | null;
		/** The assistant answer this chat waits for; it is sent here when it is written. */
		waiting_reply_id: string | null;
	};
	/** One-time codes that start a link (`/start <code>`). */
	telegram_link_codes: {
		code: string;
		member_id: string;
		expires_at: number;
	};
};

export const telegramTables = (db: DbExecutor) => db.withTables<TelegramTables>();

export const telegramMigrations: Migrations = {
	'0001_init': {
		async up(db) {
			await db.schema
				.createTable('telegram_settings')
				.addColumn('id', 'integer', (c) => c.primaryKey().check(sql`id = 1`))
				.addColumn('bot_token', 'text')
				.addColumn('bot_id', 'integer')
				.addColumn('bot_username', 'text')
				.addColumn('update_offset', 'integer', (c) => c.notNull().defaultTo(0))
				.addColumn('status_code', 'text')
				.addColumn('status_at', 'integer')
				.addColumn('updated_at', 'integer', (c) => c.notNull())
				.modifyEnd(sql`strict`)
				.execute();
			await db.schema
				.createTable('telegram_links')
				.addColumn('member_id', 'text', (c) => c.primaryKey())
				.addColumn('telegram_user_id', 'integer', (c) => c.notNull().unique())
				.addColumn('chat_id', 'integer', (c) => c.notNull())
				.addColumn('username', 'text')
				.addColumn('linked_at', 'integer', (c) => c.notNull())
				.addColumn('thread_id', 'text')
				.addColumn('waiting_reply_id', 'text')
				.modifyEnd(sql`strict`)
				.execute();
			await db.schema
				.createTable('telegram_link_codes')
				.addColumn('code', 'text', (c) => c.primaryKey())
				.addColumn('member_id', 'text', (c) => c.notNull())
				.addColumn('expires_at', 'integer', (c) => c.notNull())
				.modifyEnd(sql`strict`)
				.execute();
			await db.schema
				.createIndex('telegram_link_codes_member_idx')
				.on('telegram_link_codes')
				.columns(['member_id'])
				.execute();
		},
	},
};
