import { defineAction, defineRoute, FamosError, type UnitOfWork } from '@famos/sdk';
import { z } from 'zod';
import {
	DeleteTagInputSchema,
	normalizeTags,
	TagSchema,
	tagKey,
	UpdateTagInputSchema,
} from '../contract/index.ts';
import { calendarEdit, calendarView, tagChanged } from './capabilities.ts';
import { events, tagsOf } from './store.ts';

/**
 * Tags are free text on events. The family's tag list (names and colours) follows what events use
 * (`ensureTags`); here are the actions to tidy it: rename or recolour a tag, merge two, delete one.
 * A rename or delete rewrites the events in the same transaction. `updated_at` stays as it is: it
 * guards planned reminders, and tags do not change when a reminder fires.
 */

/** Rewrites the tag lists of all events that have `key`; `replace` null removes the tag. */
async function rewriteEvents(db: UnitOfWork['db'], key: string, replace: string | null) {
	const t = events(db);
	const rows = await t
		.selectFrom('calendar_events')
		.select(['id', 'tags'])
		.where('tags', 'is not', null)
		.execute();
	for (const row of rows) {
		const current = tagsOf(row.tags);
		if (!current.some((name) => tagKey(name) === key)) continue;
		const next = normalizeTags(
			current.flatMap((name) => (tagKey(name) === key ? (replace ? [replace] : []) : [name])),
		);
		await t
			.updateTable('calendar_events')
			.set({ tags: next.length ? JSON.stringify(next) : null })
			.where('id', '=', row.id)
			.execute();
	}
}

async function loadTag(db: UnitOfWork['db'], name: string) {
	const row = await events(db)
		.selectFrom('calendar_tags')
		.selectAll()
		.where('key', '=', tagKey(name))
		.executeTakeFirst();
	if (!row) throw new FamosError('not_found', 'Tag not found');
	return row;
}

export const updateTag = defineAction({
	id: 'calendar.updateTag',
	title: 'Rename or recolour a calendar tag',
	input: UpdateTagInputSchema,
	output: TagSchema,
	requires: calendarEdit.id,
	approval: 'never',
	async run(uow, input) {
		const current = await loadTag(uow.db, input.name);
		const t = events(uow.db);
		let name = current.name;
		let color = current.color;
		if (input.color !== undefined) color = input.color;
		if (input.newName !== undefined) {
			const newName = normalizeTags([input.newName])[0];
			if (!newName) throw new FamosError('bad_request', 'The name is empty');
			const newKey = tagKey(newName);
			if (newKey !== current.key) {
				// Renaming onto a tag that exists merges into it: its spelling stays.
				const target = await t
					.selectFrom('calendar_tags')
					.selectAll()
					.where('key', '=', newKey)
					.executeTakeFirst();
				await rewriteEvents(uow.db, current.key, target?.name ?? newName);
				await t.deleteFrom('calendar_tags').where('key', '=', current.key).execute();
				if (target) {
					color = input.color ?? target.color;
					await t.updateTable('calendar_tags').set({ color }).where('key', '=', newKey).execute();
					name = target.name;
				} else {
					await t
						.insertInto('calendar_tags')
						.values({ key: newKey, name: newName, color, created_at: current.created_at })
						.execute();
					name = newName;
				}
				uow.emit(tagChanged, { name });
				return { name, color };
			}
			// Only the spelling changes (case): events follow.
			name = newName;
			await rewriteEvents(uow.db, current.key, newName);
		}
		await t
			.updateTable('calendar_tags')
			.set({ name, color })
			.where('key', '=', current.key)
			.execute();
		uow.emit(tagChanged, { name });
		return { name, color };
	},
});

export const deleteTag = defineAction({
	id: 'calendar.deleteTag',
	title: 'Delete a calendar tag from the list and from every event',
	input: DeleteTagInputSchema,
	output: z.object({ ok: z.literal(true) }),
	requires: calendarEdit.id,
	approval: 'never',
	async run(uow, { name }) {
		const current = await loadTag(uow.db, name);
		await rewriteEvents(uow.db, current.key, null);
		await events(uow.db).deleteFrom('calendar_tags').where('key', '=', current.key).execute();
		uow.emit(tagChanged, { name: current.name });
		return { ok: true as const };
	},
});

export const listTags = defineRoute({
	method: 'get',
	path: '/tags',
	operationId: 'calendar.listTags',
	summary: 'The family tags with their colours',
	requires: calendarView.id,
	response: z.array(TagSchema),
	async handle(ctx) {
		return events(ctx.db)
			.selectFrom('calendar_tags')
			.select(['name', 'color'])
			.orderBy('key')
			.execute();
	},
});
