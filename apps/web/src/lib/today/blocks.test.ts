import { describe, expect, it } from 'vitest';
import {
	BUILT_IN_BLOCKS,
	blockOfCard,
	everythingHidden,
	shows,
	todayBlocks,
	withBlock,
} from './blocks.js';

const cards = [
	{ id: 'inbox.waiting', band: 'needs' as const },
	{ id: 'lists.overdue', band: 'needs' as const },
	{ id: 'chores.today', band: 'notes' as const },
	{ id: 'lists.tasks', band: 'notes' as const, labelKey: 'lists:today_block_tasks' },
	{ id: 'board.today', band: 'notes' as const },
	{ id: 'records.comingUp', band: 'ahead' as const, labelKey: 'records:today_block' },
];
const extensionLabel = (id: string) => `${id}:label`;

describe('which block decides whether a card shows', () => {
	it('puts the needs band under Needs you and the chores card under its rings', () => {
		expect(blockOfCard(cards[0] as (typeof cards)[number])).toBe('needs');
		expect(blockOfCard({ id: 'chores.today' })).toBe('chores');
		expect(blockOfCard({ id: 'pets.today', band: 'notes' })).toBe('pets.today');
	});
});

describe('the blocks a viewer chooses from', () => {
	it('lists the built-in blocks, then each card that is a block of its own, once', () => {
		const ids = todayBlocks([...cards, cards[3] as (typeof cards)[number]], {
			extensionLabel,
		}).map((b) => b.id);
		expect(ids).toEqual([...BUILT_IN_BLOCKS, 'lists.tasks', 'board.today', 'records.comingUp']);
	});

	it("names a card by its own label, else by its extension's name", () => {
		const blocks = todayBlocks(cards, { extensionLabel });
		expect(blocks.find((b) => b.id === 'lists.tasks')?.labelKey).toBe('lists:today_block_tasks');
		expect(blocks.find((b) => b.id === 'board.today')?.labelKey).toBe('board:label');
	});

	it("leaves out a display's person-only blocks and those of extensions that are off", () => {
		const ids = todayBlocks([], { familyMode: true, disabledExtensions: ['chores'] }).map(
			(b) => b.id,
		);
		expect(ids).not.toContain('greeting');
		expect(ids).not.toContain('needs');
		expect(ids).not.toContain('chores');
		expect(ids).toContain('clock');
	});
});

describe('hiding and showing', () => {
	it('shows unknown and new blocks by default', () => {
		expect(shows([], 'garden.today')).toBe(true);
		expect(shows(new Set(['weather']), 'weather')).toBe(false);
		expect(shows(['weather'], 'clock')).toBe(true);
	});

	it('keeps ids it does not know when one block changes', () => {
		expect(withBlock(['garden.today'], 'weather', false)).toEqual(['garden.today', 'weather']);
		expect(withBlock(['garden.today', 'weather'], 'weather', true)).toEqual(['garden.today']);
		expect(withBlock(['weather'], 'weather', false)).toEqual(['weather']);
	});

	it('knows when everything is hidden', () => {
		const blocks = todayBlocks(cards, { extensionLabel });
		const all = blocks.map((b) => b.id);
		expect(everythingHidden(blocks, all)).toBe(true);
		expect(everythingHidden(blocks, all.slice(1))).toBe(false);
		expect(everythingHidden([], [])).toBe(false);
	});
});
