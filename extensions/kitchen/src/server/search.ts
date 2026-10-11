import type { AiIndex } from '@famos/sdk';
import { kitchenView } from './capabilities.ts';
import { tables } from './store.ts';

export const RECIPE_KIND = 'kitchen.recipe';

const PAGE = 100;

/**
 * What family search reads of the kitchen: recipes, as their title, ingredients,
 * steps, tags and notes. The meal plan is a short list the assistant already reads.
 */
export const searchIndex: AiIndex = {
	kinds: {
		[RECIPE_KIND]: {
			capability: kitchenView.id,
			async load(ctx, id) {
				const row = await tables(ctx.db)
					.selectFrom('kitchen_recipes')
					.selectAll()
					.where('id', '=', id)
					.where('archived_at', 'is', null)
					.executeTakeFirst();
				if (!row) return null;
				const lines = [
					...(JSON.parse(row.ingredients) as string[]),
					...(JSON.parse(row.steps) as string[]),
					...(JSON.parse(row.tags) as string[]),
					...(row.notes ? [row.notes] : []),
				];
				return { title: row.title, text: lines.join('\n'), href: `/kitchen/recipes/${row.id}` };
			},
		},
	},
	async list(ctx, cursor) {
		let q = tables(ctx.db)
			.selectFrom('kitchen_recipes')
			.select('id')
			.where('archived_at', 'is', null)
			.orderBy('id')
			.limit(PAGE);
		if (cursor) q = q.where('id', '>', cursor);
		const rows = await q.execute();
		return {
			items: rows.map((r) => ({ kind: RECIPE_KIND, id: r.id })),
			next: rows.length === PAGE ? (rows.at(-1)?.id ?? null) : null,
		};
	},
};
