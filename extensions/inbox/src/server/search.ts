import type { AiIndex } from '@famos/sdk';
import { itemTitle } from '../contract/index.ts';
import { inboxShare } from './items.ts';
import { filesOf, ITEM_KIND, tables } from './store.ts';

const PAGE = 200;

/**
 * What family search reads of the Inbox: an item's summary and the text prepared from
 * it (shared text, text files, voice transcripts). Only the person who shared an item finds it.
 * Items filed straight on a record are never read by a model, so they are not
 * indexed; dismissed items are forgotten.
 */
export const searchIndex: AiIndex = {
	kinds: {
		[ITEM_KIND]: {
			capability: inboxShare.id,
			async load(ctx, id) {
				const row = await tables(ctx.db)
					.selectFrom('inbox_items')
					.selectAll()
					.where('id', '=', id)
					.executeTakeFirst();
				if (!row || row.status === 'dismissed' || row.status === 'filed') return null;
				const text = [row.summary, row.normalized_text ?? row.text, row.transcript]
					.filter((part): part is string => Boolean(part?.trim()))
					.join('\n\n');
				if (text === '' && !row.title) return null;
				return {
					title: itemTitle({ ...row, files: filesOf(row) }).slice(0, 120) || row.channel,
					text,
					href: '/add',
					ownerMemberId: row.created_by,
				};
			},
		},
	},
	async list(ctx, cursor) {
		let q = tables(ctx.db)
			.selectFrom('inbox_items')
			.select('id')
			.where('status', 'not in', ['dismissed', 'filed'])
			.orderBy('id')
			.limit(PAGE);
		if (cursor) q = q.where('id', '>', cursor);
		const rows = await q.execute();
		return {
			items: rows.map((r) => ({ kind: ITEM_KIND, id: r.id })),
			next: rows.length === PAGE ? (rows.at(-1)?.id ?? null) : null,
		};
	},
};
