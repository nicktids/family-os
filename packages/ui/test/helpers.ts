import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte';

const mounted: Record<string, unknown>[] = [];

/** Mounts a component into the document body and returns its container. */
export function render<P extends Record<string, unknown>>(
	component: // biome-ignore lint/suspicious/noExplicitAny: Svelte component types differ per component.
	any,
	props: P,
): HTMLElement {
	const target = document.createElement('div');
	document.body.append(target);
	const instance = mount(component, { target, props });
	mounted.push(instance);
	flushSync();
	return target;
}

export function cleanup(): void {
	for (const m of mounted.splice(0)) unmount(m);
	document.body.innerHTML = '';
}

/** A snippet that renders the given HTML. */
export function html(markup: string): Snippet {
	return createRawSnippet(() => ({ render: () => markup })) as unknown as Snippet;
}

export function key(el: Element, k: string, init: KeyboardEventInit = {}): KeyboardEvent {
	const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init });
	el.dispatchEvent(e);
	flushSync();
	return e;
}

export function click(el: Element): void {
	(el as HTMLElement).click();
	flushSync();
}

export const q = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T =>
	root.querySelector(sel) as T;
export const qa = <T extends Element = HTMLElement>(
	sel: string,
	root: ParentNode = document,
): T[] => Array.from(root.querySelectorAll(sel)) as T[];

/** Lets queued microtasks (the `tick().then(focus)` of the overlays) run. */
export async function settle(): Promise<void> {
	await Promise.resolve();
	await new Promise((r) => setTimeout(r, 0));
	flushSync();
}
