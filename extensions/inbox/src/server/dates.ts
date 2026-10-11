import { addDays, formatDate, Temporal } from '@famos/time';

/** Order of day, month and year in the family's all-numeric dates. */
export type DateOrder = 'DMY' | 'MDY' | 'YMD';

/**
 * Date help for the model, and the code-side check of its date choices. Models miscount
 * weekdays and rarely notice that "next Thursday" has two readings, so the prompt carries a
 * ready-made calendar and the decision "is this date a guess?" is made here, from the words the
 * model quotes as the source of each date.
 */

/** The next 14 days with weekday names and week labels (weeks start on `weekStart`), for the prompt. */
export function dateTable(today: string, weekStart = 1): string {
	const monday = (date: string) => {
		const d = Temporal.PlainDate.from(date);
		return d.subtract({ days: (d.dayOfWeek - weekStart + 7) % 7 }).toString();
	};
	const thisWeek = monday(today);
	const lines: string[] = [];
	for (let i = 0; i < 15; i++) {
		const date = addDays(today, i);
		const weeks = Math.round(Temporal.PlainDate.from(thisWeek).until(monday(date)).days / 7);
		const week = weeks === 0 ? 'this week' : weeks === 1 ? 'next week' : 'the week after';
		const label = i === 0 ? 'today' : i === 1 ? 'tomorrow' : week;
		lines.push(`- ${formatDate(date, 'en', { weekday: 'long' })} ${date} (${label})`);
	}
	return lines.join('\n');
}

/**
 * The words the date check reads, from the language packs: code holds no words of
 * any language. Each list is lower-case.
 */
export interface DateWords {
	/** Words that name exactly one day ("today", "tomorrow", "this evening"). */
	exactDay: readonly string[];
	/** Names of the weekdays, Monday first (index 0 = Monday). */
	weekdays: readonly (readonly string[])[];
	/** Words before a clock time ("at 9"). */
	beforeTime: readonly string[];
	/** Endings right after an hour that make it a time ("9 o'clock"). */
	afterHour: readonly string[];
}

/** The date words of every installed language, from `ExtensionContext.vocabulary`. */
export function dateWords(vocabulary: (key: string) => readonly string[]): DateWords {
	return {
		exactDay: vocabulary('inbox:words_exact_day'),
		weekdays: [1, 2, 3, 4, 5, 6, 7].map((n) => vocabulary(`inbox:words_weekday_${n}`)),
		beforeTime: vocabulary('inbox:words_before_time'),
		afterHour: vocabulary('inbox:words_after_hour'),
	};
}

const escapeRegex = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const anyOf = (words: readonly string[]) =>
	words
		.toSorted((a, b) => b.length - a.length)
		.map(escapeRegex)
		.join('|');

/** Clock times ("16:30", "4:30pm", "at 9", "9 o'clock") so their digits are not read as days. */
function timePatterns(words: DateWords): RegExp[] {
	const patterns = [
		/\d{1,2}[:.]\d{2}\s*(am|pm|a\.m\.|p\.m\.)?/giu,
		/\d{1,2}\s*(am|pm|a\.m\.|p\.m\.)/giu,
	];
	if (words.beforeTime.length)
		patterns.push(new RegExp(`(?<!\\p{L})(${anyOf(words.beforeTime)})\\s*\\d{1,2}`, 'giu'));
	if (words.afterHour.length)
		patterns.push(new RegExp(`\\d{1,2}\\s?(${anyOf(words.afterHour)})(?!\\p{L})`, 'giu'));
	return patterns;
}

/** Weekday numbers (1 = Monday) named in the text; a longer name wins over one it contains. */
function weekdaysIn(text: string, words: DateWords): number[] {
	const names = words.weekdays
		.flatMap((list, i) => list.map((name) => ({ name, day: i + 1 })))
		.toSorted((a, b) => b.name.length - a.name.length);
	if (names.length === 0) return [];
	const re = new RegExp(`(?<!\\p{L})(${names.map((n) => escapeRegex(n.name)).join('|')})`, 'giu');
	const found = new Set<number>();
	for (const m of text.matchAll(re)) {
		const hit = names.find((n) => n.name === m[1]?.toLocaleLowerCase());
		if (hit) found.add(hit.day);
	}
	return [...found];
}

/**
 * Whether a chosen date is a guess, judged from the words the model quotes as its source:
 * - no quote, or no day number in it ("next Thursday", "Cuma günü", "end of the month");
 *   words like "tomorrow" and "today" name the day themselves;
 * - a day number or weekday in the quote that does not match the chosen date (a notice saying
 *   "9 Ekim Perşembe" when 9 October is a Friday).
 */
export function isUncertainDate(
	text: string | undefined,
	date: string,
	vocabulary: DateWords,
	order: DateOrder = 'DMY',
): boolean {
	if (!text?.trim()) return true;
	const words = timePatterns(vocabulary).reduce((t, re) => t.replace(re, ' '), text);
	if (
		vocabulary.exactDay.length &&
		new RegExp(`(?<!\\p{L})(${anyOf(vocabulary.exactDay)})`, 'iu').test(words)
	)
		return false;
	if (readsOtherWay(words, date, order)) return true;
	const days = [...words.matchAll(/(?<!\d)(\d{1,2})(?!\d)/g)]
		.map((m) => Number(m[1]))
		.filter((d) => d >= 1 && d <= 31);
	if (days.length === 0) return true;
	const chosen = Temporal.PlainDate.from(date);
	if (!days.includes(chosen.day)) return true;
	const named = weekdaysIn(words, vocabulary);
	return named.length > 0 && !named.includes(chosen.dayOfWeek);
}

/**
 * An all-numeric date such as "03/04" whose two numbers are both 12 or less can be read two ways.
 * The family's own order settles it; a chosen date that follows the other reading is a guess.
 */
function readsOtherWay(words: string, date: string, order: DateOrder): boolean {
	const m = /(?<![\d./-])(\d{1,2})\s*[/.-]\s*(\d{1,2})(?![\d])/.exec(words);
	if (!m) return false;
	const [a, b] = [Number(m[1]), Number(m[2])];
	if (a > 12 || b > 12 || a === 0 || b === 0 || a === b) return false;
	const chosen = Temporal.PlainDate.from(date);
	// With the year first, a bare "10/08" is month-day (the usual short form there).
	const [day, month] = order === 'DMY' ? [a, b] : [b, a];
	return chosen.day !== day || chosen.month !== month;
}

/** Top-level input fields that hold dates (`date`, `dueDate`, `endDate`, …). */
export function datePaths(input: Record<string, unknown>): string[] {
	return Object.keys(input).filter((key) => /date$/i.test(key) && typeof input[key] === 'string');
}
