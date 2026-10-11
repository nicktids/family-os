import { type AddShoppingItemsInput, titleKey } from '@famos/ext-lists/contract';
import { defineAction } from '@famos/sdk';
import { z } from 'zod';
import { AddToShoppingSchema } from '../contract/index.ts';
import { kitchenView } from './capabilities.ts';
import { ingredientToItem } from './ingredient.ts';
import { loadRecipe } from './recipes.ts';

/**
 * "Put the ingredients on the shopping list": the chosen lines of a recipe become shopping items,
 * the product as the title and the amount as the quantity ("2 tbsp olive oil" is "Olive oil",
 * "2 tbsp"). Units and preparation words come from the language packs; nothing is converted.
 * An item already on the list is matched by its title and left as it is. The lists action runs as
 * the person, so its own permission and approval rules apply; when Lists is turned off it
 * answers `feature_off`.
 */
export const addIngredientsToShopping = defineAction({
	id: 'kitchen.addIngredientsToShopping',
	title: 'Put ingredients on the shopping list',
	input: AddToShoppingSchema,
	output: z.object({ listId: z.string(), added: z.number().int(), alreadyThere: z.number().int() }),
	// The lists action decides who may add and whether a draft is needed; here the person only
	// has to see the recipe.
	requires: kitchenView.id,
	approval: 'never',
	async run(uow, { recipeId, lines, listId }) {
		const recipe = await loadRecipe(uow.db, recipeId);
		const known = new Set(JSON.parse(recipe.ingredients) as string[]);
		const { locale } = await uow.family.settings();
		const words = {
			units: [...uow.vocabulary('lists:quantity_units'), ...uow.vocabulary('kitchen:words_units')],
			links: uow.vocabulary('kitchen:words_amount_link'),
			preparation: uow.vocabulary('kitchen:words_preparation'),
		};
		const items = new Map<string, NonNullable<ReturnType<typeof ingredientToItem>>>();
		for (const line of lines) {
			if (!known.has(line)) continue;
			const item = ingredientToItem(line, words, locale);
			if (!item) continue;
			const key = titleKey(item.title, locale);
			if (!items.has(key)) items.set(key, item);
		}
		if (items.size === 0) return { listId: listId ?? '', added: 0, alreadyThere: 0 };
		// A recipe never lowers or replaces what someone already put on the list.
		const input: AddShoppingItemsInput = {
			...(listId && { listId }),
			items: [...items.values()],
			whenOnList: 'keep',
		};
		const result = await uow.run<AddShoppingItemsInput, { listId: string; addedIds: string[] }>(
			'lists.addShoppingItems',
			input,
		);
		return {
			listId: result.listId,
			added: result.addedIds.length,
			alreadyThere: items.size - result.addedIds.length,
		};
	},
});
