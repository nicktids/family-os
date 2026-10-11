/**
 * Lists has two pages, Tasks and Shopping. The phone has one Lists tab: it opens the page the
 * person used last on this device (Shopping until then), remembered in local storage.
 */
export const LIST_PAGES = ['tasks', 'shopping'] as const;
export type ListPage = (typeof LIST_PAGES)[number];

const KEY = 'famos.lists.page';

/** Where a page lives. */
export const listPagePath = (page: ListPage) => `/lists/${page}`;

type Store = Pick<Storage, 'getItem' | 'setItem'>;
function storage(): Store | null {
	try {
		return globalThis.localStorage ?? null;
	} catch {
		return null;
	}
}

/** The page used last on this device, or Shopping. */
export function rememberedListPage(store: Store | null = storage()): ListPage {
	try {
		const value = store?.getItem(KEY);
		return LIST_PAGES.find((page) => page === value) ?? 'shopping';
	} catch {
		return 'shopping';
	}
}

/** Remembers the page that is open (a private window may refuse; then it is not kept). */
export function rememberListPage(page: ListPage, store: Store | null = storage()): void {
	try {
		store?.setItem(KEY, page);
	} catch {
		// not kept on this device
	}
}
