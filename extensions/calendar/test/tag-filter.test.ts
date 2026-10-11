import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	colorOf,
	filterByTags,
	loadTagFilter,
	NEUTRAL_TAG_COLOR,
	pruneSelection,
	saveTagFilter,
	suggestTags,
} from '../src/web/tags.ts';

const item = (title: string, tags: string[]) => ({ title, tags });
const items = [
	item('Dentist', ['Health']),
	item('Parents evening', ['School', 'Teachers']),
	item('Plain', []),
	item('Service', ['car']),
];
const titles = (list: { title: string }[]) => list.map((i) => i.title);

describe('tag filter', () => {
	it('shows everything when nothing is selected', () => {
		expect(titles(filterByTags(items, []))).toEqual(titles(items));
	});

	it('keeps items with any selected tag, ignoring case', () => {
		expect(titles(filterByTags(items, ['health']))).toEqual(['Dentist']);
		expect(titles(filterByTags(items, ['HEALTH', 'Car']))).toEqual(['Dentist', 'Service']);
		expect(titles(filterByTags(items, ['teachers']))).toEqual(['Parents evening']);
		expect(filterByTags(items, ['nothing'])).toEqual([]);
	});

	it('forgets selected tags that no longer exist', () => {
		const tags = [{ name: 'Health', color: '#3f7fb5' }];
		expect(pruneSelection(['health', 'Gone'], tags)).toEqual(['health']);
	});

	it('looks up colours case-insensitively and falls back to a neutral colour', () => {
		const tags = [{ name: 'Health', color: '#3f7fb5' }];
		expect(colorOf(tags, 'HEALTH')).toBe('#3f7fb5');
		expect(colorOf(tags, 'unknown')).toBe(NEUTRAL_TAG_COLOR);
	});

	it('suggests unused tags that match what was typed', () => {
		const tags = ['School', 'Health', 'Car', 'Shopping'].map((name) => ({
			name,
			color: '#000000',
		}));
		expect(suggestTags(tags, ['school'], '').map((t) => t.name)).toEqual([
			'Health',
			'Car',
			'Shopping',
		]);
		expect(suggestTags(tags, [], 'sho').map((t) => t.name)).toEqual(['Shopping']);
	});
});

describe('remembering the filter on this device', () => {
	afterEach(() => vi.unstubAllGlobals());

	const fakeStorage = () => {
		const data = new Map<string, string>();
		return {
			getItem: (key: string) => data.get(key) ?? null,
			setItem: (key: string, value: string) => void data.set(key, value),
			removeItem: (key: string) => void data.delete(key),
		};
	};

	it('saves and restores the selection', () => {
		vi.stubGlobal('localStorage', fakeStorage());
		expect(loadTagFilter()).toEqual([]);
		saveTagFilter(['Health', 'Car']);
		expect(loadTagFilter()).toEqual(['Health', 'Car']);
		saveTagFilter([]);
		expect(loadTagFilter()).toEqual([]);
	});

	it('survives blocked or corrupt storage', () => {
		const blocked = {
			getItem: () => {
				throw new Error('blocked');
			},
			setItem: () => {
				throw new Error('blocked');
			},
			removeItem: () => {
				throw new Error('blocked');
			},
		};
		vi.stubGlobal('localStorage', blocked);
		expect(loadTagFilter()).toEqual([]);
		expect(() => saveTagFilter(['x'])).not.toThrow();
		vi.stubGlobal('localStorage', { ...fakeStorage(), getItem: () => '{"not":"a list"}' });
		expect(loadTagFilter()).toEqual([]);
		vi.stubGlobal('localStorage', { ...fakeStorage(), getItem: () => 'not json' });
		expect(loadTagFilter()).toEqual([]);
	});
});
