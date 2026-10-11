import type { MemberDayWords, NextUpWords, StatusWords } from '@famos/ui/famos';
import type { t as translate } from './i18n.svelte.js';

/**
 * The words of Today's shared components, from the app's catalog. The components and
 * the model in `@famos/ui/famos` hold no words; a composition builds these once with `t` and
 * hands them down.
 */
export type Translate = typeof translate;

export interface TodayWords {
	nextUp: NextUpWords;
	status: StatusWords;
	day: MemberDayWords;
	/** The phone's one line for the people with nothing: "Nothing planned for Deniz and Amy." */
	nothingFor(names: string): string;
	family: string;
	anyone: string;
	chores: string;
	choreRing(name: string, done: number, total: number): string;
	hourly: string;
	/** "From the photos · October 2025" (the month from `formatPhotoMonth`). */
	photo(month: string): string;
	/** Me with nothing more of mine today. */
	noneForMe: string;
	/** The toggle's choice could not be saved. */
	nextUpError: string;
	/** The label of the day by person while the hero shows the next thing. */
	restOfDay: string;
	choresToday: string;
	kitchen: string;
	/** Wall's rows of each person's next thing: "Who, next". */
	whoNext: string;
	/** "Deniz, Amy and Elif": the last name joined by the catalog's "and". */
	names(list: readonly string[]): string;
}

export function todayWords(t: Translate): TodayWords {
	return {
		nextUp: {
			nextUp: t('today_next_up'),
			toggle: t('today_next_up_toggle'),
			family: t('today_next_up_family'),
			me: t('today_next_up_me'),
			countdown: {
				toGo: t('today_countdown_to_go'),
				hours: t('today_countdown_hours'),
				starts: t('today_countdown_starts'),
				now: t('today_countdown_now'),
				inDuration: (duration) => t('today_countdown_in', { duration }),
				nowUntil: (time) => t('today_countdown_now_until', { time }),
			},
			pill: {
				at: (place) => t('today_pill_at', { place }),
				starts: (time) => t('today_pill_starts', { time }),
				until: (time) => t('today_pill_until', { time }),
			},
		},
		status: {
			soon: (title, duration) => t('today_status_soon', { title, duration }),
			at: (title, time) => t('today_status_at', { title, time }),
			until: (title, time) => t('today_status_until', { title, time }),
			choresLeft: (count) => t('today_status_chores', { count }),
			nothing: t('today_status_nothing'),
		},
		day: {
			allDay: t('today_day_all_day'),
			more: (count) => t('today_day_more', { count }),
			nothing: t('today_day_nothing'),
			nothingMore: t('today_day_nothing_more'),
			followedBy: (list) => t('today_day_then', { list }),
		},
		nothingFor: (names) => t('today_day_nothing_for', { names }),
		family: t('today_family'),
		anyone: t('today_anyone'),
		chores: t('today_chores'),
		choreRing: (name, done, total) => t('today_chore_ring', { name, done, total }),
		hourly: t('today_hourly'),
		photo: (month) => t('today_photo', { month }),
		noneForMe: t('today_next_up_none'),
		nextUpError: t('today_next_up_error'),
		restOfDay: t('today_rest_title'),
		choresToday: t('today_chores_title'),
		kitchen: t('today_kitchen'),
		whoNext: t('today_who_next'),
		names: (list) =>
			list.length <= 1
				? (list[0] ?? '')
				: t('today_names_and', { list: list.slice(0, -1).join(', '), last: list.at(-1) }),
	};
}
