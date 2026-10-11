import type { TestKernel } from '@famos/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { BoardNote } from '../src/contract/index.ts';
import { AI, applied, createKernel, type Person, person, refused } from './support.ts';

let k: TestKernel;
let ayse: Person; // admin: manage
let bora: Person; // member: use
let elif: Person; // supervised: use
let guest: Person; // guest: view

beforeEach(async () => {
	({ k } = await createKernel());
	ayse = await person(k, 'admin', 'Ayşe');
	bora = await person(k, 'member', 'Bora');
	elif = await person(k, 'supervised', 'Elif');
	guest = await person(k, 'guest', 'Misafir');
});
afterEach(() => k.close());

const post = (text: string, actor = bora.actor) =>
	applied<BoardNote>(k, 'board.postNote', { text }, actor);
const notes = (): Promise<BoardNote[]> => k.route('board.getNotes').call();
const order = async () => (await notes()).map((n) => n.text).join(' ');
const move = (input: Record<string, unknown>, actor = bora.actor) =>
	applied<{ moved: boolean }>(k, 'board.moveNote', input, actor);
const refusedMove = (input: Record<string, unknown>, actor = bora.actor) =>
	refused(k.runner.invoke('board.moveNote', input, actor));

/** Three notes by Bora, put up a minute apart: the board shows them newest first, c b a. */
async function three() {
	const ids: string[] = [];
	for (const text of ['a', 'b', 'c']) {
		ids.push((await post(text)).id);
		k.clock.set(k.clock.now() + 60_000);
	}
	const [a = '', b = '', c = ''] = ids;
	return { a, b, c };
}

describe('moving a note', () => {
	it('leaves notes never moved newest first', async () => {
		await three();
		expect(await order()).toBe('c b a');
	});

	it('moves a note between two others, to the start and to the end', async () => {
		const { a, b, c } = await three();
		expect(await move({ id: a, before: b })).toEqual({ moved: true });
		expect(await order()).toBe('c a b');
		await move({ id: b, before: c });
		expect(await order()).toBe('b c a');
		await move({ id: b, after: a });
		expect(await order()).toBe('c a b');
		await move({ id: c, after: b });
		expect(await order()).toBe('a b c');
	});

	it('changes nothing when the note is already there, and tells nobody', async () => {
		const { a, b, c } = await three();
		await move({ id: a, before: b });
		const events: string[] = [];
		k.bus.onAny((name) => void events.push(name));
		expect(await move({ id: a, before: b })).toEqual({ moved: false });
		expect(await move({ id: a, after: c })).toEqual({ moved: false });
		expect(events).toEqual([]);
		expect(await order()).toBe('c a b');
	});

	it('tells other screens when a note moved', async () => {
		const { a, b } = await three();
		const events: string[] = [];
		k.bus.onAny((name) => void events.push(name));
		await move({ id: a, before: b });
		expect(events).toContain('board.changed');
	});

	it('puts a new note first, also on a board the family arranged', async () => {
		const { b, c } = await three();
		await move({ id: c, after: b });
		expect(await order()).toBe('b c a');
		await post('d');
		expect(await order()).toBe('d b c a');
	});

	it('keeps pinned notes first and moves a note only among notes of its kind', async () => {
		const { a, b, c } = await three();
		await applied(k, 'board.pinNote', { id: a, pinned: true }, ayse.actor);
		expect(await order()).toBe('a c b');
		expect(await refusedMove({ id: b, before: a })).toBe('bad_request');
		await move({ id: b, before: c });
		expect(await order()).toBe('a b c');
		// A note pinned later joins the pinned ones at the top.
		await applied(k, 'board.pinNote', { id: c, pinned: true }, ayse.actor);
		expect(await order()).toBe('c a b');
		await move({ id: c, after: a });
		expect(await order()).toBe('a c b');
		// Unpinned, it goes back to the top of the others.
		await applied(k, 'board.pinNote', { id: a, pinned: false }, ayse.actor);
		expect(await order()).toBe('c a b');
	});

	it('lets only the author or a manager move a note', async () => {
		const { a, b } = await three();
		expect(await refusedMove({ id: a, before: b }, elif.actor)).toBe('forbidden');
		expect(await refusedMove({ id: a, before: b }, guest.actor)).toBe('forbidden');
		await move({ id: a, before: b }, ayse.actor);
		expect(await order()).toBe('c a b');
	});

	it('refuses a move without a place, beside itself or beside a note that is gone', async () => {
		const { a, b } = await three();
		expect(await refusedMove({ id: a })).toBe('bad_request');
		expect(await refusedMove({ id: a, before: b, after: b })).toBe('bad_request');
		expect(await refusedMove({ id: a, before: a })).toBe('bad_request');
		await applied(k, 'board.removeNote', { id: b }, bora.actor);
		expect(await refusedMove({ id: a, before: b })).toBe('bad_request');
	});

	it('numbers the notes afresh when the gap between two wears thin', async () => {
		const { a, b, c } = await three();
		// Each move halves the same gap; after about twenty it is too small to split.
		for (let i = 0; i < 30; i++) {
			await move({ id: a, before: b });
			expect(await order()).toBe('c a b');
			await move({ id: b, before: a });
			expect(await order()).toBe('c b a');
		}
		const rows = await k.ctx.db
			.withTables<{ board_notes: { id: string; position: number | null } }>()
			.selectFrom('board_notes')
			.select(['id', 'position'])
			.orderBy('position')
			.execute();
		expect(rows.map((r) => r.id)).toEqual([c, b, a]);
		const [first, second, third] = rows.map((r) => r.position ?? Number.NaN);
		expect((second ?? 0) - (first ?? 0)).toBeGreaterThan(1e-6);
		expect((third ?? 0) - (second ?? 0)).toBeGreaterThan(1e-6);
	});

	it('gives the AI the board in the same order', async () => {
		const { a, b } = await three();
		await move({ id: a, before: b });
		const { notes: list } = await applied<{ notes: { text: string }[] }>(
			k,
			'board.listNotes',
			{},
			AI,
		);
		expect(list.map((n) => n.text).join(' ')).toBe('c a b');
	});
});

/** The message of a refused call. */
const refusal = (input: Record<string, unknown>, actor = bora.actor) =>
	k.runner.invoke('board.moveNote', input, actor).then(
		() => null,
		(e: { message?: string }) => e.message ?? '',
	);

describe('moving a note as the board shows it (reported: refused for neighbours)', () => {
	it('moves a note after its neighbour and before its neighbour, never moved before', async () => {
		const { a, b, c } = await three();
		// The board: c b a. "a" after its neighbour "b" is where it is; after "c" it moves.
		expect(await move({ id: a, after: b })).toEqual({ moved: false });
		expect(await move({ id: b, before: c })).toEqual({ moved: true });
		expect(await order()).toBe('b c a');
		expect(await move({ id: a, before: c })).toEqual({ moved: true });
		expect(await order()).toBe('b a c');
	});

	it('moves among the unpinned notes while pinned ones are on the board', async () => {
		const { a, b, c } = await three();
		const d = (await post('d')).id;
		await applied(k, 'board.pinNote', { id: d, pinned: true }, ayse.actor);
		await applied(k, 'board.pinNote', { id: c, pinned: true }, ayse.actor);
		// Neither pinned note was ever moved: the newer one comes first.
		expect(await order()).toBe('d c b a');
		expect(await move({ id: a, before: b })).toEqual({ moved: true });
		expect(await order()).toBe('d c a b');
		expect(await move({ id: d, after: c }, ayse.actor)).toEqual({ moved: true });
		expect(await order()).toBe('c d a b');
	});

	it('says plainly why a note cannot go beside a note of the other kind', async () => {
		const { a, b, c } = await three();
		await applied(k, 'board.pinNote', { id: c, pinned: true }, ayse.actor);
		// The board: c (pinned) b a. "b" looks next to "c", but pinned notes always come first.
		expect(await refusal({ id: b, before: c })).toMatch(/pinned/i);
		expect(await refusal({ id: c, after: b }, ayse.actor)).toMatch(/pinned/i);
		expect(await move({ id: a, before: b })).toEqual({ moved: true });
	});

	it('says plainly when the other note is not on the board', async () => {
		const { a, b } = await three();
		const ended = (
			await applied<BoardNote>(
				k,
				'board.postNote',
				{ text: 'old', endsOn: '2026-10-06' },
				bora.actor,
			)
		).id;
		k.clock.set(k.clock.now() + 2 * 86_400_000);
		expect(await refusal({ id: a, after: ended })).toMatch(/not on the board/i);
		expect(
			await refusal({ id: a, before: 'board_note_00000000-0000-7000-8000-000000000000' }),
		).toMatch(/not on the board/i);
		expect(await move({ id: a, before: b })).toEqual({ moved: true });
	});
});
