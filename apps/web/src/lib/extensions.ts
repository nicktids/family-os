import type {
	AnyDraftPresenter,
	NavContribution,
	PageContribution,
	SlotContribution,
	WebExtension,
} from '@famos/ui/slots';
import { appSlotContributions } from './app-slots.js';

/**
 * Collects every extension's `./web` entry at build time. Extensions are
 * first-party workspace packages, so a glob over the monorepo is enough; no runtime loading.
 */
const modules = import.meta.glob<{ default: WebExtension }>(
	'../../../../extensions/*/src/web/index.ts',
	{
		eager: true,
	},
);

export const webExtensions: WebExtension[] = Object.values(modules).map((m) => m.default);
export const slotContributions: SlotContribution[] = [
	...webExtensions.flatMap((e) => e.slots ?? []),
	...appSlotContributions,
];
export const navContributions: NavContribution[] = webExtensions
	.flatMap((e) => e.nav ?? [])
	.toSorted((a, b) => (a.order ?? 0) - (b.order ?? 0));

/** Draft presenters by action id; the Inbox renders drafts without knowing any extension. */
export const draftPresenters: ReadonlyMap<string, AnyDraftPresenter> = new Map(
	webExtensions.flatMap((e) => e.drafts ?? []).map((d) => [d.actionId, d]),
);

/** The extension that owns a namespaced id (`calendar.page` → `calendar`). */
export const ownerOf = (id: string) => id.split('.')[0] ?? id;

/** Contributions of extensions that are turned on (More → Features). */
export const enabledOnly = <T extends { id: string }>(
	items: readonly T[],
	off: readonly string[],
) => (off.length === 0 ? [...items] : items.filter((item) => !off.includes(ownerOf(item.id))));

/** Extension pages by path, served by the catch-all route. */
export const pageContributions: ReadonlyMap<string, PageContribution> = new Map(
	webExtensions.flatMap((e) => e.pages ?? []).map((p) => [p.path, p]),
);

/**
 * The page for a path: an exact match, else a pattern whose `:name` segments match one segment
 * each (`/vehicles/:id`); the matched values are the page's `params`.
 */
export function matchPage(
	pathname: string,
	pages: ReadonlyMap<string, PageContribution> = pageContributions,
): { page: PageContribution; params: Record<string, string> } | undefined {
	const path = pathname.replace(/\/+$/, '') || '/';
	const exact = pages.get(path);
	if (exact) return { page: exact, params: {} };
	const segments = path.split('/');
	for (const page of pages.values()) {
		const pattern = page.path.split('/');
		if (!page.path.includes(':') || pattern.length !== segments.length) continue;
		const params: Record<string, string> = {};
		const fits = pattern.every((part, i) => {
			const segment = segments[i] ?? '';
			if (!part.startsWith(':')) return part === segment;
			if (!segment) return false;
			params[part.slice(1)] = decodeURIComponent(segment);
			return true;
		});
		if (fits) return { page, params };
	}
	return undefined;
}

/**
 * The app's own pages, from the SvelteKit route files (not loaded, only their paths): `/more`,
 * `/settings/ai`… Dynamic and catch-all routes are left out; extension pages are matched below.
 */
const APP_PAGES = new Set(
	Object.keys(import.meta.glob('../routes/**/+page.svelte'))
		.map((file) => file.slice('../routes'.length, -'/+page.svelte'.length) || '/')
		.filter((path) => !path.includes('[')),
);

/** Whether a path is a page of the app: its own, or one of an extension that is turned on. */
export function isAppPath(path: string, off: readonly string[] = []): boolean {
	if (APP_PAGES.has(path.replace(/\/+$/, '') || '/')) return true;
	const found = matchPage(path);
	return found !== undefined && !off.includes(ownerOf(found.page.id));
}
