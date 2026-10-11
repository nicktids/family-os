import { describe, expect, it } from 'vitest';
import { type Box, gapAt, moveLocal, placeAt, stepPlace } from '../src/web/order.ts';

/** p1 p2 are pinned; a b c are not. */
const board = [
	{ id: 'p1', pinned: true },
	{ id: 'p2', pinned: true },
	{ id: 'a', pinned: false },
	{ id: 'b', pinned: false },
	{ id: 'c', pinned: false },
];
const ids = (notes: { id: string }[]) => notes.map((n) => n.id).join(' ');

describe('stepPlace', () => {
	it('moves one step among the notes of the same group', () => {
		expect(stepPlace(board, 'b', -1)).toEqual({ before: 'a' });
		expect(stepPlace(board, 'b', 1)).toEqual({ after: 'c' });
		expect(stepPlace(board, 'p2', -1)).toEqual({ before: 'p1' });
		expect(stepPlace(board, 'p1', 1)).toEqual({ after: 'p2' });
	});

	it('has no step past the edge of the group', () => {
		expect(stepPlace(board, 'a', -1)).toBeNull();
		expect(stepPlace(board, 'c', 1)).toBeNull();
		expect(stepPlace(board, 'p2', 1)).toBeNull();
		expect(stepPlace(board, 'p1', -1)).toBeNull();
		expect(stepPlace(board, 'gone', 1)).toBeNull();
	});
});

describe('placeAt', () => {
	it('keeps a note inside its group', () => {
		// Unpinned "c" dropped at the very top lands first among the unpinned.
		expect(placeAt(board, 'c', 0)).toEqual({ before: 'a' });
		// Pinned "p1" dropped at the end lands last among the pinned.
		expect(placeAt(board, 'p1', 4)).toEqual({ after: 'p2' });
	});

	it('is null where the note already is, or when it is alone in its group', () => {
		expect(placeAt(board, 'b', 3)).toBeNull();
		expect(placeAt(board, 'b', 1)).not.toBeNull();
		const lone = [
			{ id: 'p', pinned: true },
			{ id: 'a', pinned: false },
		];
		expect(placeAt(lone, 'p', 1)).toBeNull();
		expect(placeAt(lone, 'a', 0)).toBeNull();
	});
});

describe('moveLocal', () => {
	it('puts the note before or after another', () => {
		expect(ids(moveLocal(board, 'c', { before: 'a' }))).toBe('p1 p2 c a b');
		expect(ids(moveLocal(board, 'a', { after: 'c' }))).toBe('p1 p2 b c a');
		expect(ids(moveLocal(board, 'a', { after: 'gone' }))).toBe('p1 p2 a b c');
	});
});

describe('gapAt', () => {
	// Two columns: x 0–100 holds n0 n1, x 120–220 holds n2 n3.
	const boxes: Box[] = [
		{ id: 'n0', left: 0, right: 100, top: 0, bottom: 100 },
		{ id: 'n1', left: 0, right: 100, top: 110, bottom: 210 },
		{ id: 'n2', left: 120, right: 220, top: 0, bottom: 60 },
		{ id: 'n3', left: 120, right: 220, top: 70, bottom: 300 },
	];

	it('finds the note whose middle is below the pointer, in the column under it', () => {
		expect(gapAt(boxes, 50, 10)).toBe(0);
		expect(gapAt(boxes, 50, 120)).toBe(1);
		expect(gapAt(boxes, 150, 10)).toBe(2);
		expect(gapAt(boxes, 150, 100)).toBe(3);
	});

	it('takes the gap after the last note of a column, and the nearest column outside them', () => {
		expect(gapAt(boxes, 50, 400)).toBe(2);
		expect(gapAt(boxes, 150, 400)).toBe(4);
		expect(gapAt(boxes, 500, 10)).toBe(2);
		expect(gapAt(boxes, -40, 160)).toBe(2);
		expect(gapAt([], 0, 0)).toBe(0);
	});
});
