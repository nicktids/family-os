import { family } from './family.svelte.js';

/**
 * Dates, times and numbers follow the family's region formats, never the UI language.
 * Read these inside `$derived` or the template so they update when the settings change.
 */
export function dateTimeFormat(options: Intl.DateTimeFormatOptions = {}): Intl.DateTimeFormat {
	const clock = options.hour !== undefined || options.timeStyle !== undefined;
	return new Intl.DateTimeFormat(family.formatLocale, {
		...(clock && options.hour12 === undefined && { hourCycle: family.hourCycle }),
		...options,
	});
}

export function numberFormat(options: Intl.NumberFormatOptions = {}): Intl.NumberFormat {
	return new Intl.NumberFormat(family.formatLocale, options);
}
