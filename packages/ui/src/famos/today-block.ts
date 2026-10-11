import { getContext, setContext } from 'svelte';

/**
 * A block of Today that the person may hide from its label (the quick path to "What Today
 * shows"). The page sets it around a block (`TodayBlock`); the block's label row
 * (`TodaySection`, or a page's own with `TodayBlockMenu`) then shows a `...` menu with one item.
 * A family display and a preview set none, so their labels have no menu.
 */
export interface TodayBlockOptions {
	/** The block's name, for the menu's accessible name and the action sheet's title. */
	readonly name: string;
	/** "Options for Tasks". */
	readonly menuLabel: string;
	/** "Hide from Today". */
	readonly hideLabel: string;
	readonly cancelLabel: string;
	hide(): void;
}

/** What a label reads: the block's options while it may be hidden, else undefined. */
export type TodayBlockContext = () => TodayBlockOptions | undefined;

const KEY = Symbol('famos.todayBlock');

export const setTodayBlock = (block: TodayBlockContext): void => {
	setContext(KEY, block);
};

export const getTodayBlock = (): TodayBlockContext | undefined =>
	getContext<TodayBlockContext | undefined>(KEY);
