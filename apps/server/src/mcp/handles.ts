import { createHmac } from 'node:crypto';
import type { HandleTable } from '@famos/sdk';

/** `vehicle:3fa9c1b2d4`: the kind, a colon, ten hex digits. */
export const STABLE_HANDLE = /[a-z][a-z0-9_]*:[0-9a-f]{10,24}\b/g;

/**
 * Handles for a stateless client. The assistant numbers records within one chat turn
 * (`vehicle:1`); MCP has no turn, so a handle must mean the same record in the next request. It
 * is derived from the id with a keyed hash (the key is the token's own id), so the same token
 * always sees a record under the same handle, and another token sees another handle. The
 * mapping back is remembered per token (`core_api_token_handles`): a handle the token was never
 * shown cannot be resolved, so an invented one is refused like an invented id.
 */
export interface StableHandleTable extends HandleTable {
	/** Registers a handle the token was shown earlier (read back from storage). */
	preload(handle: string, id: string): void;
	/** Handles created during this request, to be remembered. */
	created(): { handle: string; id: string }[];
}

export function createStableHandles(key: string): StableHandleTable {
	const toId = new Map<string, string>();
	const byId = new Map<string, string>();
	const fresh = new Map<string, string>();
	const digest = (id: string) => createHmac('sha256', key).update(id).digest('hex');
	return {
		add(kind, id) {
			const known = byId.get(id);
			if (known) return known;
			const hash = digest(id);
			let handle = `${kind}:${hash.slice(0, 10)}`;
			// A clash of two records inside one request: lengthen the second.
			for (let length = 12; toId.has(handle) && length <= hash.length; length += 2)
				handle = `${kind}:${hash.slice(0, length)}`;
			toId.set(handle, id);
			byId.set(id, handle);
			fresh.set(handle, id);
			return handle;
		},
		handleOf: (id) => byId.get(id),
		toId,
		ids: () => new Set(byId.keys()),
		preload(handle, id) {
			toId.set(handle, id);
			byId.set(id, handle);
		},
		created: () => [...fresh].map(([handle, id]) => ({ handle, id })),
	};
}
