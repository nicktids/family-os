import { dateTimeFormat } from './format.svelte.js';
import { getLocale } from './i18n.svelte.js';

/** "5 minutes ago", "yesterday", or a date once it is a week old. */
export function ago(ms: number): string {
	const seconds = Math.round((ms - Date.now()) / 1000);
	const rtf = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' });
	const abs = Math.abs(seconds);
	if (abs < 60) return rtf.format(0, 'minute');
	if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
	if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), 'hour');
	if (abs < 7 * 86_400) return rtf.format(Math.round(seconds / 86_400), 'day');
	return dateTimeFormat({ dateStyle: 'medium' }).format(ms);
}
