import { epochOf } from '@famos/time';
import type { TimelineItem } from '@famos/ui/slots';
import { viewTimeline } from '@famos/ui/timeline';
import { describe, expect, it } from 'vitest';
import {
	composeSentence,
	emphasisRuns,
	eveningStart,
	isEvening,
	lastTonight,
	mergeTimeline,
	orderCards,
	partOfDay,
	quietPhrases,
} from './today.js';

const TZ = 'Europe/Istanbul';
const DAY = '2026-10-09';
const at = (time: string) => epochOf(DAY, time, TZ);
const event = (id: string, from?: string, to?: string, extra: Partial<TimelineItem> = {}) =>
	({
		id,
		title: id,
		kind: 'event',
		href: '/calendar',
		...(from && { start: at(from) }),
		...(to && { end: at(to) }),
		...extra,
	}) satisfies TimelineItem;

describe('timeline merge and view', () => {
	const items = mergeTimeline([
		[event('swim', '17:30', '18:30'), event('trip', undefined, undefined, { slot: 'allday' })],
		[
			event('drop-off', '08:30', '09:00'),
			event('bins', undefined, undefined, { slot: 'evening', kind: 'chore' }),
		],
		[event('plants', undefined, undefined, { slot: 'anytime', kind: 'chore' })],
	]);

	it('orders all-day, timed, any time, evening', () => {
		expect(items.map((i) => i.id)).toEqual(['trip', 'drop-off', 'swim', 'plants', 'bins']);
	});

	it('puts the now-line after what has started and lifts the next item', () => {
		const view = viewTimeline(items, at('08:10'));
		expect(view.nowIndex).toBe(1);
		expect(view.nextId).toBe('drop-off');
		const later = viewTimeline(items, at('10:00'));
		expect(later.nowIndex).toBe(2);
		expect(later.nextId).toBe('swim');
	});

	it('has no next item after the last timed one, and the line sits before any-time items', () => {
		const view = viewTimeline(items, at('19:00'));
		expect(view.nextId).toBeNull();
		expect(view.nowIndex).toBe(3);
	});

	it('never lifts a nominal (meal plan) item', () => {
		const meal = event('lunch', '12:30', undefined, { kind: 'meal', nominal: true });
		const view = viewTimeline([meal, event('dentist', '13:00')], at('08:00'));
		expect(view.nextId).toBe('dentist');
	});
});

describe('evening mode', () => {
	it('starts at 20:00 or the end of the last timed item, whichever is later', () => {
		expect(eveningStart([event('a', '17:00', '18:00')], DAY, TZ)).toBe(at('20:00'));
		expect(eveningStart([event('a', '21:00', '22:30')], DAY, TZ)).toBe(at('22:30'));
		expect(eveningStart([], DAY, TZ)).toBe(at('20:00'));
	});

	it('ignores meal-plan items for the end of the day', () => {
		const meal = event('dinner', '23:00', undefined, { kind: 'meal', nominal: true });
		expect(eveningStart([meal], DAY, TZ)).toBe(at('20:00'));
	});

	it('is the evening from then on', () => {
		const items = [event('a', '19:30', '21:00')];
		expect(isEvening(at('20:30'), items, DAY, TZ)).toBe(false);
		expect(isEvening(at('21:00'), items, DAY, TZ)).toBe(true);
	});
});

describe('the day head sentence', () => {
	const base = { part: 'morning' as const, name: 'Deniz', plan: 6, needs: 3 };

	it('names what needs the person, the plan and tonight', () => {
		expect(composeSentence({ ...base, lastTitle: "Dinner at grandma's" }).key).toBe(
			'home_sentence_needs_plan_last',
		);
		expect(composeSentence(base).key).toBe('home_sentence_needs_plan');
		expect(composeSentence({ ...base, plan: 0 }).key).toBe('home_sentence_needs');
		expect(composeSentence(base).params).toMatchObject({ count: 3, plan: 6, name: 'Deniz' });
	});

	it('says nothing about what needs the person when Needs you is hidden', () => {
		const hidden = { ...base, needs: 0, needsHidden: true };
		expect(composeSentence(hidden).key).toBe('home_sentence_day_plan');
		expect(composeSentence({ ...hidden, lastTitle: 'Swim' }).key).toBe(
			'home_sentence_day_plan_last',
		);
		expect(composeSentence({ ...hidden, evening: true, tomorrowStart: '08:00' }).key).toBe(
			'home_sentence_day_evening',
		);
		expect(composeSentence({ ...hidden, evening: true }).key).toBe(
			'home_sentence_day_evening_free',
		);
	});

	it('says nothing needs the person in the second shape', () => {
		expect(composeSentence({ ...base, needs: 0 }).key).toBe('home_sentence_clear_plan');
		expect(composeSentence({ ...base, needs: 0, lastTitle: 'Swim' }).key).toBe(
			'home_sentence_clear_plan_last',
		);
		expect(composeSentence({ ...base, needs: 0, plan: 0 }).key).toBe('home_sentence_quiet');
	});

	it('looks at tomorrow in the evening, and welcomes a new family', () => {
		const evening = { ...base, part: 'evening' as const, needs: 0, evening: true };
		expect(composeSentence({ ...evening, tomorrowStart: '08:30' })).toMatchObject({
			key: 'home_sentence_evening',
			params: { time: '08:30' },
		});
		expect(composeSentence({ ...evening, tomorrowStart: null }).key).toBe(
			'home_sentence_evening_free',
		);
		// Something still needs the person: the day shapes stay.
		expect(composeSentence({ ...evening, needs: 2 }).key).toBe('home_sentence_needs_plan');
		expect(composeSentence({ ...base, needs: 0, fresh: true }).key).toBe('home_sentence_new');
		// A suggestion waiting beats the welcome.
		expect(composeSentence({ ...base, fresh: true }).key).toBe('home_sentence_needs_plan');
	});

	it('splits **bold** runs without building markup', () => {
		expect(emphasisRuns('Good. **3 things need you**, 6 on the plan.')).toEqual([
			{ text: 'Good. ', bold: false },
			{ text: '3 things need you', bold: true },
			{ text: ', 6 on the plan.', bold: false },
		]);
	});

	it('knows the part of the day and the last item tonight', () => {
		expect(partOfDay(at('08:10'), TZ)).toBe('morning');
		expect(partOfDay(at('13:00'), TZ)).toBe('afternoon');
		expect(partOfDay(at('21:15'), TZ)).toBe('evening');
		const items = [event('a', '10:00'), event('dinner', '19:30')];
		expect(lastTonight(items, at('08:10'), TZ)?.id).toBe('dinner');
		expect(lastTonight(items, at('20:00'), TZ)).toBeNull();
		expect(lastTonight([event('a', '10:00')], at('08:10'), TZ)).toBeNull();
	});
});

describe('the quiet line', () => {
	const cards = [{ id: 'lists.tasks' }, { id: 'chores.today' }, { id: 'kitchen.x' }, { id: 'a.b' }];
	const reports = {
		'lists.tasks': { count: 0, quietKey: 'lists:quiet_tasks' },
		'chores.today': { count: 2, quietKey: 'chores:quiet' },
		'a.b': { count: 0, quietKey: '' },
		// 'kitchen.x' never reported
	};

	it('collects the phrases of empty cards in card order', () => {
		expect(quietPhrases(cards, reports)).toEqual([{ key: 'lists:quiet_tasks' }]);
	});

	it('starts with nothing planned, and passes a count when a card has one', () => {
		const out = quietPhrases(
			cards,
			{ ...reports, 'a.b': { count: 0, quietKey: 'x', quietCount: 2 } },
			{ planEmpty: true, planKey: 'app:home_quiet_plan' },
		);
		expect(out).toEqual([
			{ key: 'app:home_quiet_plan' },
			{ key: 'lists:quiet_tasks' },
			{ key: 'x', count: 2 },
		]);
	});

	it('orders cards by what is urgent, then by contribution order', () => {
		const ordered = orderCards(
			[
				{ id: 'a', order: 1 },
				{ id: 'b', order: 2 },
				{ id: 'c', order: 3 },
			],
			{ b: { count: 1, quietKey: '', urgent: 1 }, c: { count: 1, quietKey: '', urgent: 2 } },
		);
		expect(ordered.map((c) => c.id)).toEqual(['c', 'b', 'a']);
	});
});
