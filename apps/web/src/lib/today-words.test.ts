import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import en from '../messages/en.json';
import { type Translate, todayWords } from './today-words.js';

const tr = JSON.parse(
	readFileSync(join(import.meta.dirname, '../../../../languages/tr/app.json'), 'utf8'),
) as Record<string, string>;

/** A catalog lookup with i18next's plural suffixes and `{{placeholders}}`; records the keys. */
function translator(catalog: Record<string, string>, used: Set<string>): Translate {
	return ((key: string, options: Record<string, unknown> = {}) => {
		const plural =
			typeof options.count === 'number' ? `${key}_${options.count === 1 ? 'one' : 'other'}` : key;
		const found = catalog[plural] ?? catalog[key];
		used.add(catalog[plural] !== undefined ? plural : key);
		if (found === undefined) throw new Error(`missing ${key}`);
		return found.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(options[name]));
	}) as unknown as Translate;
}

/** Calls every function in the words so each key is looked up. */
function exercise(words: ReturnType<typeof todayWords>) {
	const { nextUp, status, day } = words;
	return [
		nextUp.countdown.inDuration('25 minutes'),
		nextUp.countdown.nowUntil('16:30'),
		nextUp.pill.at('Music school'),
		nextUp.pill.starts('15:45'),
		nextUp.pill.until('16:30'),
		status.soon('Piano lesson', '25 min'),
		status.at('Football', '17:00'),
		status.until('Piano lesson', '16:30'),
		status.choresLeft(1),
		status.choresLeft(3),
		day.more(2),
		day.followedBy('Football 17:00'),
		words.nothingFor('Deniz and Amy'),
		words.choreRing('Elif', 1, 3),
		words.photo('October 2025'),
		words.noneForMe,
		words.nextUpError,
		words.restOfDay,
		words.choresToday,
		words.kitchen,
		words.whoNext,
		words.names(['Deniz', 'Amy', 'Elif']),
	];
}

describe('Today words', () => {
	it('reads every today_ key of the English catalog, and Turkish has them all', () => {
		const used = new Set<string>();
		const words = todayWords(translator(en, used));
		const english = exercise(words);
		expect(english).toContain('Piano lesson in 25 min');
		expect(english).toContain('1 chore left');
		expect(english).toContain('3 chores left');
		expect(english).toContain('From the photos · October 2025');
		expect(english).toContain('Deniz, Amy and Elif');
		expect(words.nextUp.nextUp).toBe('Next up');

		const todayKeys = Object.keys(en).filter((k) => k.startsWith('today_'));
		expect([...used].sort()).toEqual(todayKeys.sort());
		for (const key of todayKeys) expect(tr[key], key).toBeTruthy();
		expect(exercise(todayWords(translator(tr, new Set())))).toContain(
			'Fotoğraflardan · October 2025',
		);
	});
});
