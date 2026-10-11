import type { AiIndex } from '@famos/sdk';
import { itemUrl, serviceUrl } from '../contract/index.ts';
import { homeView } from './capabilities.ts';
import { tables } from './store.ts';

export const ITEM_SEARCH_KIND = 'home.item';
export const SERVICE_SEARCH_KIND = 'home.service';

const PAGE = 100;

/**
 * What family search reads of the home: the things (name, room, brand, model, notes)
 * and the services (kind, provider, notes). Serial and account numbers and phone
 * numbers are never indexed: they are the kind of detail the AI is not told.
 */
export const searchIndex: AiIndex = {
	kinds: {
		[ITEM_SEARCH_KIND]: {
			capability: homeView.id,
			async load(ctx, id) {
				const row = await tables(ctx.db)
					.selectFrom('home_items')
					.selectAll()
					.where('id', '=', id)
					.where('archived_at', 'is', null)
					.executeTakeFirst();
				if (!row) return null;
				const text = [row.room, row.brand, row.model, row.notes]
					.filter((part): part is string => Boolean(part))
					.join('\n');
				return { title: row.name, text, href: itemUrl(row.id) };
			},
		},
		[SERVICE_SEARCH_KIND]: {
			capability: homeView.id,
			async load(ctx, id) {
				const row = await tables(ctx.db)
					.selectFrom('home_services')
					.selectAll()
					.where('id', '=', id)
					.where('archived_at', 'is', null)
					.executeTakeFirst();
				if (!row) return null;
				const text = [row.kind, row.notes]
					.filter((part): part is string => Boolean(part))
					.join('\n');
				return { title: row.provider, text, href: serviceUrl(row.id) };
			},
		},
	},
	/** Cursor: `<kind>:<last id>`; things first, then services. */
	async list(ctx, cursor) {
		const [phase, after] = cursor?.split(':', 2) ?? [];
		const kind = phase === SERVICE_SEARCH_KIND ? SERVICE_SEARCH_KIND : ITEM_SEARCH_KIND;
		const table = kind === ITEM_SEARCH_KIND ? 'home_items' : 'home_services';
		let q = tables(ctx.db)
			.selectFrom(table)
			.select('id')
			.where('archived_at', 'is', null)
			.orderBy('id')
			.limit(PAGE);
		if (kind === phase && after) q = q.where('id', '>', after);
		const rows = await q.execute();
		const items = rows.map((r) => ({ kind, id: r.id }));
		if (rows.length === PAGE) return { items, next: `${kind}:${rows.at(-1)?.id}` };
		return { items, next: kind === ITEM_SEARCH_KIND ? `${SERVICE_SEARCH_KIND}:` : null };
	},
};
