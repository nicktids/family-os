import type { DbExecutor } from '@famos/sdk';
import type { CoreTables } from './tables.ts';

/** Small JSON values kept in `core_settings` by key (language and theme packs, choices). */
export async function readJson<T>(db: DbExecutor, key: string, fallback: T): Promise<T> {
	const row = await db
		.withTables<CoreTables>()
		.selectFrom('core_settings')
		.select('value')
		.where('key', '=', key)
		.executeTakeFirst();
	if (!row) return fallback;
	try {
		return JSON.parse(row.value) as T;
	} catch {
		return fallback;
	}
}

export async function writeJson(
	db: DbExecutor,
	key: string,
	value: unknown,
	now: number,
): Promise<void> {
	const text = JSON.stringify(value);
	await db
		.withTables<CoreTables>()
		.insertInto('core_settings')
		.values({ key, value: text, updated_at: now })
		.onConflict((oc) => oc.column('key').doUpdateSet({ value: text, updated_at: now }))
		.execute();
}
