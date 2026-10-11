import { api } from './api';

/**
 * Whether search by meaning is set up (an embedding model is chosen). Every search box on screen
 * shares one read: boxes that open together (Today, the style pictures in Settings → Appearance)
 * ask once, and a box that opens later asks again.
 */
class SearchStatus {
	configured = $state(false);
	#pending: Promise<void> | null = null;

	refresh(): Promise<void> {
		this.#pending ??= api
			.GET('/api/v1/core/search/status')
			.then((res) => {
				this.configured = res.data?.configured ?? false;
			})
			.catch(() => {
				// Unreachable: the box stays as it is.
			})
			.finally(() => {
				this.#pending = null;
			});
		return this.#pending;
	}
}

export const searchStatus = new SearchStatus();
