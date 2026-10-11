import { z } from 'zod';

/**
 * Typed identifiers: `<prefix>_<uuidv7>`. The prefix names the entity (and by convention its
 * owning extension), so any ID can be routed back to its owner without a lookup.
 */
export type Id<P extends string> = `${P}_${string}`;

const ID_PREFIX = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';

export function assertIdPrefix(prefix: string): void {
	if (!ID_PREFIX.test(prefix)) {
		throw new Error(`Invalid ID prefix "${prefix}": use lowercase snake_case, e.g. "shop_item"`);
	}
}

/** Zod schema for an ID with the given prefix. */
export function idSchema<P extends string>(prefix: P) {
	assertIdPrefix(prefix);
	const pattern = new RegExp(`^${prefix}_${UUID}$`);
	return z
		.string()
		.regex(pattern, `Expected a ${prefix} ID`)
		.transform((value) => value as Id<P>);
}

/** Returns the prefix of a typed ID, e.g. `shop_item` for `shop_item_0192…`. */
export function idPrefix(id: string): string {
	const index = id.length - 37; // "_" + 36-char UUID
	if (index <= 0 || id[index] !== '_') throw new Error(`Not a typed ID: ${id}`);
	return id.slice(0, index);
}
