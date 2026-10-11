import type { AiIndex } from '@famos/sdk';
import { calendarView } from './capabilities.ts';
import { events } from './store.ts';

export const EVENT_KIND = 'calendar.event';

const PAGE = 200;

/**
 * What family search reads of the calendar: an event's title, place and notes. Dates
 * are not text; the assistant's calendar tools answer "what is on Friday". Events from
 * subscribed calendars are somebody else's data and are not indexed.
 */
export const searchIndex: AiIndex = {
	kinds: {
		[EVENT_KIND]: {
			capability: calendarView.id,
			async load(ctx, id) {
				const row = await events(ctx.db)
					.selectFrom('calendar_events')
					.selectAll()
					.where('id', '=', id)
					.where('deleted_at', 'is', null)
					.executeTakeFirst();
				if (!row) return null;
				const text = [row.location, row.notes].filter((part): part is string => Boolean(part));
				return { title: row.title, text: text.join('\n'), href: '/calendar' };
			},
		},
	},
	async list(ctx, cursor) {
		let q = events(ctx.db)
			.selectFrom('calendar_events')
			.select('id')
			.where('deleted_at', 'is', null)
			.orderBy('id')
			.limit(PAGE);
		if (cursor) q = q.where('id', '>', cursor);
		const rows = await q.execute();
		return {
			items: rows.map((r) => ({ kind: EVENT_KIND, id: r.id })),
			next: rows.length === PAGE ? (rows.at(-1)?.id ?? null) : null,
		};
	},
};
