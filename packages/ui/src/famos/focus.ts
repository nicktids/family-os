/** Focus helpers shared by Menu, ActionSheet, Sheet and Dialog. */
export const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusables(root: HTMLElement): HTMLElement[] {
	return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
		(el) => !el.hasAttribute('hidden') && el.getAttribute('aria-hidden') !== 'true',
	);
}

/** Moves focus to `[data-autofocus]`, else the first field, else the first focusable, else the root. */
export function focusFirst(root: HTMLElement): void {
	const wanted =
		root.querySelector<HTMLElement>('[data-autofocus]') ??
		root.querySelector<HTMLElement>('input:not([type=hidden]), select, textarea') ??
		focusables(root)[0];
	(wanted ?? root).focus();
}

/** Keeps Tab inside `root` (call from a keydown handler). Returns true when it handled the key. */
export function trapTab(root: HTMLElement, e: KeyboardEvent): boolean {
	if (e.key !== 'Tab') return false;
	const list = focusables(root);
	if (list.length === 0) {
		e.preventDefault();
		root.focus();
		return true;
	}
	const first = list[0] as HTMLElement;
	const last = list[list.length - 1] as HTMLElement;
	const active = document.activeElement;
	if (e.shiftKey && (active === first || active === root)) {
		e.preventDefault();
		last.focus();
		return true;
	}
	if (!e.shiftKey && active === last) {
		e.preventDefault();
		first.focus();
		return true;
	}
	if (!root.contains(active)) {
		e.preventDefault();
		first.focus();
		return true;
	}
	return false;
}
