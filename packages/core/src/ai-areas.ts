import { AI_AREA_ACCESS, type AiAreaAccess, type DbExecutor } from '@famos/sdk';
import { z } from 'zod';
import type { CoreTables } from './tables.ts';

/**
 * What the AI may use, per area. An area is an extension; `core` is never an area
 * (what the AI may know about the household is governed by the privacy switches). The stored
 * choice is a map of extension id → access; extensions without a choice use their default:
 * Off when marked sensitive, otherwise Any provider. Cached in memory like features; refreshed
 * after a change commits. Access control, the AI catalog and the model adapter all read it.
 */
export interface AiAreas {
	access(extensionId: string): AiAreaAccess;
	/** The access an extension has until the family chooses. */
	defaultFor(extensionId: string): AiAreaAccess;
	refresh(db: DbExecutor): Promise<void>;
}

const KEY = 'ai_areas';
const StoredSchema = z.record(z.string(), z.enum(AI_AREA_ACCESS));

export function createAiAreas(isSensitive: (extensionId: string) => boolean): AiAreas {
	let chosen: Record<string, AiAreaAccess> = {};
	const defaultFor = (id: string): AiAreaAccess => (isSensitive(id) ? 'off' : 'any');
	return {
		defaultFor,
		access: (id) => (id === 'core' ? 'any' : (chosen[id] ?? defaultFor(id))),
		async refresh(db) {
			chosen = await readAiAreas(db);
		},
	};
}

export async function readAiAreas(db: DbExecutor): Promise<Record<string, AiAreaAccess>> {
	const row = await db
		.withTables<CoreTables>()
		.selectFrom('core_settings')
		.select('value')
		.where('key', '=', KEY)
		.executeTakeFirst();
	if (!row) return {};
	try {
		const parsed = StoredSchema.safeParse(JSON.parse(row.value));
		return parsed.success ? parsed.data : {};
	} catch {
		return {};
	}
}

export async function writeAiAreas(
	db: DbExecutor,
	areas: Record<string, AiAreaAccess>,
	now: number,
) {
	const value = JSON.stringify(areas);
	await db
		.withTables<CoreTables>()
		.insertInto('core_settings')
		.values({ key: KEY, value, updated_at: now })
		.onConflict((oc) => oc.column('key').doUpdateSet({ value, updated_at: now }))
		.execute();
}
