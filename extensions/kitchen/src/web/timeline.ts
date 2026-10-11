import { epochOf } from '@famos/time';
import type { TimelineContribution } from '@famos/ui/slots';
import type { MealSlot } from '../contract/index.js';
import { loadMeals } from './data.js';

/**
 * The meal plan has no clock, so a meal is placed by a nominal hour of its slot to keep the day
 * in order; the page shows no time for it and never calls it "next".
 */
const NOMINAL: Record<MealSlot, string> = {
	breakfast: '08:00',
	lunch: '12:30',
	dinner: '18:30',
	other: '16:00',
};

/** Today's meals on the day's timeline on Today. */
export const kitchenTimeline: TimelineContribution = {
	id: 'kitchen.meals',
	requires: 'kitchen.view',
	invalidateOn: ['kitchen.'],
	async load(day, app) {
		const meals = await loadMeals(day, day);
		return meals.map((m) => ({
			id: `kitchen:${m.id}`,
			start: epochOf(day, NOMINAL[m.slot], app.timeZone()),
			title: `${app.t(`kitchen:slot_${m.slot}`)}: ${m.title}`,
			subtitle: app.t('kitchen:timeline_meal_plan'),
			kind: 'meal' as const,
			nominal: true,
			href: m.recipeId ? `/kitchen/recipes/${m.recipeId}` : '/kitchen/plan',
		}));
	},
};
