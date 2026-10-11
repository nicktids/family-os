import type { Page } from '@playwright/test';
import { FAMILY_TIME_ZONE } from './sign-in.ts';

/** The family's day, and a clock to stand at a time of day. */

/** The family's date `offset` days from today, as YYYY-MM-DD. */
export const day = (offset: number): string =>
	new Intl.DateTimeFormat('en-CA', { timeZone: FAMILY_TIME_ZONE }).format(
		new Date(Date.now() + offset * 86_400_000),
	);

/** The browser's clock: today at `time` (HH:MM) in the family's zone (Istanbul has no DST now). */
export async function standAt(page: Page, time: string) {
	await page.clock.setFixedTime(new Date(`${day(0)}T${time}:00+03:00`));
}
