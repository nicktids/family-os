import type { BoardNote } from '../contract/index.js';

/** Where a note goes: just before one note or just after another (as `board.moveNote` takes it). */
export type Place = { before: string } | { after: string };

type Ordered = Pick<BoardNote, 'id' | 'pinned'>;

/**
 * The place for the gap at `index` in `others` (the board without the moved note), kept inside
 * the moved note's own group: pinned notes stay first. Null when the note has no neighbour of
 * its kind, or the place is where it already is.
 */
export function placeAt(notes: readonly Ordered[], id: string, index: number): Place | null {
	const moved = notes.find((n) => n.id === id);
	if (!moved) return null;
	const current = notes.findIndex((n) => n.id === id);
	const others = notes.filter((n) => n.id !== id);
	const pinnedCount = others.filter((n) => n.pinned).length;
	const [from, to] = moved.pinned ? [0, pinnedCount] : [pinnedCount, others.length];
	const at = Math.min(Math.max(index, from), to);
	if (at === current) return null;
	const next = others[at];
	if (next && next.pinned === moved.pinned) return { before: next.id };
	const prev = others[at - 1];
	if (prev && prev.pinned === moved.pinned) return { after: prev.id };
	return null;
}

/** "Move earlier" (-1) or "Move later" (1): one step among the notes of its group. */
export function stepPlace(notes: readonly Ordered[], id: string, step: -1 | 1): Place | null {
	const current = notes.findIndex((n) => n.id === id);
	if (current < 0) return null;
	// Among the others, one step earlier is the gap before the previous note; later, after the next.
	return placeAt(notes, id, step === -1 ? current - 1 : current + 1);
}

/** The board as it will look once the note moved; the server sends the same order back. */
export function moveLocal<T extends Ordered>(notes: readonly T[], id: string, place: Place): T[] {
	const moved = notes.find((n) => n.id === id);
	if (!moved) return [...notes];
	const others = notes.filter((n) => n.id !== id);
	const target = others.findIndex((n) => n.id === ('before' in place ? place.before : place.after));
	if (target < 0) return [...notes];
	const index = 'before' in place ? target : target + 1;
	return [...others.slice(0, index), moved, ...others.slice(index)];
}

/** A note's box on the page, measured once when a drag starts (page coordinates). */
export type Box = { id: string; left: number; right: number; top: number; bottom: number };

/**
 * The gap under the pointer, as an index among the boxes of the other notes (in board order):
 * the column under the pointer (or the nearest one), then the first note whose middle is below it.
 * Notes flow down each column and on into the next, so "after the last note of a column" is the
 * index after it.
 */
export function gapAt(boxes: readonly Box[], x: number, y: number): number {
	if (boxes.length === 0) return 0;
	// Columns: boxes that share a left edge (within a few pixels).
	const columns: { left: number; right: number; items: number[] }[] = [];
	boxes.forEach((box, i) => {
		const column = columns.find((c) => Math.abs(c.left - box.left) < 4);
		if (column) column.items.push(i);
		else columns.push({ left: box.left, right: box.right, items: [i] });
	});
	const distance = (c: { left: number; right: number }) =>
		x < c.left ? c.left - x : x > c.right ? x - c.right : 0;
	const column = columns.reduce((best, c) => (distance(c) < distance(best) ? c : best));
	for (const i of column.items) {
		const box = boxes[i] as Box;
		if (y < (box.top + box.bottom) / 2) return i;
	}
	return (column.items.at(-1) ?? boxes.length - 1) + 1;
}
