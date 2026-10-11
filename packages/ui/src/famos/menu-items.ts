import type { Snippet } from 'svelte';

/** One action of a Menu or an ActionSheet. */
export type MenuItem = {
	id: string;
	label: string;
	/** A 16 px icon (Menu) or 18 px icon (ActionSheet). */
	icon?: Snippet;
	/** Shown at the right of a Menu item (a keycap such as `e`). Not used by the ActionSheet. */
	kbd?: string;
	/** Destructive items get `destructive` text and a separator before them. */
	danger?: boolean;
	disabled?: boolean;
	onselect: () => void;
};
