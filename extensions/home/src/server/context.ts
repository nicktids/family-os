import { AiContextSchema, defineAction } from '@famos/sdk';
import { z } from 'zod';
import { HOME_KIND, homeUrl, ITEM_KIND, itemUrl } from '../contract/index.ts';
import { homeView } from './capabilities.ts';
import { tables } from './store.ts';

const MAX_CONTEXT = 50;
const TENURE_WORDS = { owner: 'owned', tenant: 'rented', other: '' } as const;

/**
 * What the AI may know about the household's homes, so a receipt or warranty card can name the
 * right one. Read by the Inbox as the AI actor; a locked area refuses it. Name and tenure only:
 * no address and no notes.
 */
export const aiContext = defineAction({
	id: 'home.aiContext',
	title: 'Homes, for the AI',
	input: z.object({}),
	output: AiContextSchema,
	readOnly: true,
	requires: homeView.id,
	ai: {
		description:
			'Lists the household homes by name and tenure. Use it to find which home a question is about.',
	},
	async run(uow) {
		const rows = await tables(uow.db)
			.selectFrom('home_homes')
			.selectAll()
			.where('archived_at', 'is', null)
			.orderBy('created_at')
			.limit(MAX_CONTEXT)
			.execute();
		return {
			kind: HOME_KIND,
			label: 'Homes',
			items: rows.map((r) => ({
				id: r.id,
				label: r.name,
				...(TENURE_WORDS[r.tenure] && { details: TENURE_WORDS[r.tenure] }),
				url: homeUrl(r.id),
			})),
		};
	},
});

/**
 * The same for the things in the homes: what they are, brand and model, the room, which home and
 * the warranty end. No serial numbers, no notes, no account numbers.
 */
export const aiContextItems = defineAction({
	id: 'home.aiContextItems',
	title: 'Things in the home, for the AI',
	input: z.object({}),
	output: AiContextSchema,
	readOnly: true,
	requires: homeView.id,
	ai: {
		description:
			'Lists the things in the homes (appliances, devices): name, brand, model, room and warranty end. Use it to look up a thing in the home.',
	},
	async run(uow) {
		const rows = await tables(uow.db)
			.selectFrom('home_items')
			.innerJoin('home_homes', 'home_homes.id', 'home_items.home_id')
			.select([
				'home_items.id as id',
				'home_items.name as name',
				'home_items.brand as brand',
				'home_items.model as model',
				'home_items.room as room',
				'home_items.warranty_until as warranty_until',
				'home_homes.name as home_name',
			])
			.where('home_items.archived_at', 'is', null)
			.where('home_homes.archived_at', 'is', null)
			.orderBy('home_items.created_at')
			.limit(MAX_CONTEXT)
			.execute();
		return {
			kind: ITEM_KIND,
			label: 'Things in the home',
			items: rows.map((r) => {
				const details = [
					[r.brand, r.model].filter(Boolean).join(' '),
					r.room,
					`in ${r.home_name}`,
					r.warranty_until ? `warranty until ${r.warranty_until}` : '',
				]
					.filter(Boolean)
					.join(', ');
				return { id: r.id, label: r.name, details, url: itemUrl(r.id) };
			}),
		};
	},
});
