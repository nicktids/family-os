/**
 * A small in-memory fixed-window limiter (per process: a restart only forgets it). Used for
 * unauthenticated routes that create records, such as starting a display pairing.
 */
export function createRateLimiter(options: { max: number; windowMs: number; now?: () => number }) {
	const now = options.now ?? Date.now;
	const hits = new Map<string, { count: number; resetAt: number }>();
	return {
		/** Counts one hit for `key`; false when the key is over its limit for this window. */
		hit(key: string): boolean {
			const at = now();
			if (hits.size > 5000) for (const [k, v] of hits) if (v.resetAt <= at) hits.delete(k);
			const entry = hits.get(key);
			if (!entry || entry.resetAt <= at) {
				hits.set(key, { count: 1, resetAt: at + options.windowMs });
				return true;
			}
			entry.count++;
			return entry.count <= options.max;
		},
	};
}
