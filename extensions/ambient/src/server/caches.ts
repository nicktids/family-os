/**
 * In-memory cache of one running server (never persisted: weather is other people's content).
 * It lives per extension context and is dropped when the settings change, so a new place never
 * serves what the old one produced.
 */

export const WEATHER_TTL_MS = 30 * 60_000;

export interface AmbientCaches {
	version: number;
	weather: { at: number; key: string; value: unknown } | null;
	/** Requests in flight, so concurrent displays share one upstream call. */
	inflight: Map<string, Promise<unknown>>;
}

const perContext = new WeakMap<object, AmbientCaches>();

export function cachesFor(owner: object, version: number): AmbientCaches {
	const existing = perContext.get(owner);
	if (existing && existing.version === version) return existing;
	const fresh: AmbientCaches = { version, weather: null, inflight: new Map() };
	perContext.set(owner, fresh);
	return fresh;
}

/** Runs `work` once for concurrent callers with the same key. */
export function shared<T>(caches: AmbientCaches, key: string, work: () => Promise<T>): Promise<T> {
	const running = caches.inflight.get(key);
	if (running) return running as Promise<T>;
	const promise = work().finally(() => caches.inflight.delete(key));
	caches.inflight.set(key, promise);
	return promise;
}
