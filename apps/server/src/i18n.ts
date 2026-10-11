import ambientEn from '@famos/ext-ambient/messages/en.json' with { type: 'json' };
import assistantEn from '@famos/ext-assistant/messages/en.json' with { type: 'json' };
import boardEn from '@famos/ext-board/messages/en.json' with { type: 'json' };
import calendarEn from '@famos/ext-calendar/messages/en.json' with { type: 'json' };
import choresEn from '@famos/ext-chores/messages/en.json' with { type: 'json' };
import homeEn from '@famos/ext-home/messages/en.json' with { type: 'json' };
import inboxEn from '@famos/ext-inbox/messages/en.json' with { type: 'json' };
import kitchenEn from '@famos/ext-kitchen/messages/en.json' with { type: 'json' };
import listsEn from '@famos/ext-lists/messages/en.json' with { type: 'json' };
import petsEn from '@famos/ext-pets/messages/en.json' with { type: 'json' };
import recordsEn from '@famos/ext-records/messages/en.json' with { type: 'json' };
import vehiclesEn from '@famos/ext-vehicles/messages/en.json' with { type: 'json' };
import {
	addCatalogs,
	buildResources,
	type Catalog,
	type Catalogs,
	canonicalLocale,
	createI18n,
	DEFAULT_LOCALE,
	type i18n,
} from '@famos/i18n';
import appEn from '../../web/src/messages/en.json' with { type: 'json' };
import type { LanguageRegistry } from './languages.ts';

/**
 * The English catalogs, by namespace: namespace `app` is the app's own messages, every
 * extension's catalog sits under its id. English is the only language the code carries; the
 * others are language packs. The JSON files are imported statically so the server
 * bundle contains them.
 */
export const ENGLISH: Catalogs = {
	app: appEn,
	ambient: ambientEn as Catalog,
	assistant: assistantEn as Catalog,
	board: boardEn as Catalog,
	calendar: calendarEn as Catalog,
	chores: choresEn as Catalog,
	home: homeEn as Catalog,
	inbox: inboxEn as Catalog,
	kitchen: kitchenEn as Catalog,
	lists: listsEn as Catalog,
	pets: petsEn as Catalog,
	records: recordsEn as Catalog,
	vehicles: vehiclesEn as Catalog,
};

/**
 * Renders translation keys on the server (notifications, Telegram, email) from English plus the
 * registry's packs. The language is the recipient's; a missing language or string is English.
 * Follows the registry: installing or removing a pack takes effect on the next call.
 */
export function createTranslate(languages: LanguageRegistry) {
	let built = -1;
	let instance: i18n | undefined;
	const current = (): i18n => {
		if (instance && built === languages.version) return instance;
		const english = Object.entries(ENGLISH).map(([namespace, catalog]) => ({
			namespace,
			locale: DEFAULT_LOCALE,
			catalog,
		}));
		instance = createI18n({
			resources: buildResources(english),
			locale: DEFAULT_LOCALE,
			defaultNS: 'app',
		});
		for (const pack of languages.packs()) addCatalogs(instance, pack.manifest.code, pack.catalogs);
		built = languages.version;
		return instance;
	};
	/** `key` may carry a namespace (`inbox:notify_kind_x`); unknown keys come back as the key. */
	const translate = (locale: string, key: string, params?: Record<string, unknown>): string => {
		const i18n = current();
		const tag = canonicalLocale(locale);
		const lng = tag && languages.has(tag) ? tag : DEFAULT_LOCALE;
		return i18n.exists(key, { lng, ...params }) ? String(i18n.t(key, { lng, ...params })) : key;
	};
	return translate;
}

/**
 * The words a key lists (comma-separated) in English and every installed pack, lower-cased and
 * without repeats (`ExtensionContext.vocabulary`). Cached until the packs change.
 */
export function createVocabulary(languages: LanguageRegistry) {
	const translate = createTranslate(languages);
	let built = -1;
	const cache = new Map<string, readonly string[]>();
	return (key: string): readonly string[] => {
		if (built !== languages.version) {
			cache.clear();
			built = languages.version;
		}
		const known = cache.get(key);
		if (known) return known;
		const codes = [DEFAULT_LOCALE, ...languages.packs().map((p) => p.manifest.code)];
		const words = new Set<string>();
		for (const code of codes) {
			const text = translate(code, key);
			if (text === key) continue;
			for (const word of text.split(',')) {
				const clean = word.trim().toLocaleLowerCase(code);
				if (clean) words.add(clean);
			}
		}
		const list = [...words];
		cache.set(key, list);
		return list;
	};
}
