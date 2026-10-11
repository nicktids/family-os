import { compareDates, isValidDate, Temporal, weekOf } from '@famos/time';
import { MEAL_SLOTS, type MealEntry, type MealSlot } from '../contract/index.js';

/** The meals every day offers as a place to fill; `other` shows only when something is in it. */
export const DAILY_SLOTS: readonly MealSlot[] = ['breakfast', 'lunch', 'dinner'];

/** One meal place on a day: what is planned there, and whether it is an empty place to fill. */
export interface SlotLine {
	slot: MealSlot;
	meals: MealEntry[];
}

/** A day's meal places in order: breakfast, lunch and dinner always, `other` when it has a meal. */
export function slotLines(date: string, meals: MealEntry[]): SlotLine[] {
	return MEAL_SLOTS.map((slot) => ({
		slot,
		meals: meals.filter((m) => m.date === date && m.slot === slot),
	})).filter((line) => line.meals.length > 0 || DAILY_SLOTS.includes(line.slot));
}

/** The meal plan's address, opened at the week of `date`. */
export const planPath = (date: string): string => `/kitchen/plan?date=${date}`;

/** How many weeks the week of `date` lies after (or, negative, before) the week of `today`. */
export function weekOffset(today: string, date: string, weekStart: number): number {
	if (!isValidDate(date)) return 0;
	const [from] = weekOf(today, weekStart);
	const [to] = weekOf(date, weekStart);
	if (!from || !to || compareDates(from, to) === 0) return 0;
	const days = Temporal.PlainDate.from(from).until(Temporal.PlainDate.from(to), {
		largestUnit: 'days',
	}).days;
	return Math.round(days / 7);
}
