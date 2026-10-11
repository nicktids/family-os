import { describe, expect, it } from 'vitest';
import type { MealEntry } from '../src/contract/index.ts';
import { planPath, slotLines, weekOffset } from '../src/web/plan.ts';

const meal = (date: string, slot: MealEntry['slot'], title: string): MealEntry => ({
	id: `meal_${date}_${slot}_${title}`,
	date,
	slot,
	recipeId: null,
	title,
	note: null,
	createdAt: 0,
});

describe('slotLines', () => {
	it('offers breakfast, lunch and dinner on an empty day, in that order', () => {
		expect(slotLines('2026-10-12', [])).toEqual([
			{ slot: 'breakfast', meals: [] },
			{ slot: 'lunch', meals: [] },
			{ slot: 'dinner', meals: [] },
		]);
	});

	it("puts the day's meals in their places and shows Other only when it has one", () => {
		const meals = [
			meal('2026-10-12', 'dinner', 'Soup'),
			meal('2026-10-12', 'other', 'Cake'),
			meal('2026-10-12', 'dinner', 'Bread'),
			meal('2026-10-13', 'lunch', 'Not today'),
		];
		const lines = slotLines('2026-10-12', meals);
		expect(lines.map((l) => l.slot)).toEqual(['breakfast', 'lunch', 'dinner', 'other']);
		expect(lines[1]?.meals).toEqual([]);
		expect(lines[2]?.meals.map((m) => m.title)).toEqual(['Soup', 'Bread']);
		expect(lines[3]?.meals.map((m) => m.title)).toEqual(['Cake']);
	});
});

describe('weekOffset', () => {
	it('is 0 within the same week and for no or a broken date', () => {
		expect(weekOffset('2026-10-14', '2026-10-18', 1)).toBe(0);
		expect(weekOffset('2026-10-14', '', 1)).toBe(0);
		expect(weekOffset('2026-10-14', 'soon', 1)).toBe(0);
	});

	it('counts whole weeks forward and back', () => {
		expect(weekOffset('2026-10-14', '2026-10-19', 1)).toBe(1);
		expect(weekOffset('2026-10-14', '2026-11-04', 1)).toBe(3);
		expect(weekOffset('2026-10-14', '2026-10-11', 1)).toBe(-1);
	});

	it("follows the family's first day of the week", () => {
		// 2026-10-18 is a Sunday: the next week when weeks start on Sunday, the same one from Monday.
		expect(weekOffset('2026-10-14', '2026-10-18', 7)).toBe(1);
		expect(weekOffset('2026-10-14', '2026-10-18', 1)).toBe(0);
	});
});

describe('planPath', () => {
	it('opens the plan at the given day', () => {
		expect(planPath('2026-10-19')).toBe('/kitchen/plan?date=2026-10-19');
	});
});
