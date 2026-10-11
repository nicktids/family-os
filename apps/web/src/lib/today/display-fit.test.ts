import type { TimelineItem } from '@famos/ui/slots';
import { describe, expect, it, vi } from 'vitest';
import { byTightness, type DisplayFit, endedFirst } from './display-fit.js';

// The barrel holds Svelte components this project cannot load; `isTimed` is rebuilt from the
// timeline's own grouping, as `@famos/ui/famos` defines it.
vi.mock('@famos/ui/famos', async () => {
	const { groupOf } = await import('@famos/ui/timeline');
	const timed = groupOf({ id: '', title: '', kind: 'event', href: '', start: 0 });
	return {
		isTimed: (item: TimelineItem) =>
			groupOf(item) === timed && item.start !== undefined && !item.nominal,
	};
});

const fit = (tight: number): DisplayFit => ({
	tight,
	drop: new Set(),
	shift: false,
	hold: false,
	ready: () => {},
});

const item = (id: string, start?: number, end?: number): TimelineItem => ({
	id,
	title: id,
	kind: 'event',
	href: '/calendar',
	...(start !== undefined && { start }),
	...(end !== undefined && { end }),
});

describe('byTightness', () => {
	it('takes the step for the tightness, and the last one beyond the steps', () => {
		expect(byTightness(undefined, [5, 3, 2])).toBe(5);
		expect(byTightness(fit(0), [5, 3, 2])).toBe(5);
		expect(byTightness(fit(1), [5, 3, 2])).toBe(3);
		expect(byTightness(fit(3), [5, 3, 2])).toBe(2);
		expect(byTightness(fit(2), [])).toBe(0);
	});
});

describe('endedFirst', () => {
	const now = 1_000;
	const items = [
		item('ended early', 100, 200),
		item('ended late', 300, 900),
		item('all day'),
		item('ongoing', 900, 1_500),
		item('later', 2_000, 2_500),
	];

	it('keeps the list when it fits', () => {
		expect(endedFirst(items, 5, now)).toBe(items);
		expect(endedFirst(items, 9, now)).toBe(items);
	});

	it('drops what has ended first, in order, as many as it must', () => {
		expect(endedFirst(items, 4, now).map((i) => i.id)).toEqual([
			'ended late',
			'all day',
			'ongoing',
			'later',
		]);
		expect(endedFirst(items, 3, now).map((i) => i.id)).toEqual(['all day', 'ongoing', 'later']);
	});

	it('never drops what is still to come, and leaves the rest to "+n more"', () => {
		expect(endedFirst(items, 1, now).map((i) => i.id)).toEqual(['all day', 'ongoing', 'later']);
	});

	it('treats an item without an end as ending when it starts', () => {
		const list = [item('a point', 500), item('later', 2_000)];
		expect(endedFirst(list, 1, now).map((i) => i.id)).toEqual(['later']);
	});
});
