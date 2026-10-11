<script lang="ts">
	import type { Snippet } from 'svelte';
	import { setStepsContext } from './steps.js';

	/**
	 * Guided steps: a flow with more than one thing to do, as numbered
	 * steps. The `current` step is open, the others are folded to one line, a done step is ticked.
	 * With `onselect`, a done step can be opened again (to fix a code typed wrong). `large` is the
	 * size for a screen on the wall. Put `Step`s inside; never more than one filled button, and
	 * that one in the open step.
	 */
	let {
		current,
		onselect,
		large = false,
		label,
		doneLabel,
		children,
	}: {
		/** The open step, from 1; past the last step every step is done. */
		current: number;
		onselect?: (n: number) => void;
		large?: boolean;
		/** Accessible name of the list (already translated). */
		label?: string;
		/** Said after a done step's title by screen readers ("done"), already translated. */
		doneLabel?: string;
		children: Snippet;
	} = $props();

	setStepsContext({
		get current() {
			return current;
		},
		get large() {
			return large;
		},
		get doneLabel() {
			return doneLabel;
		},
		get select() {
			return onselect;
		},
	});
</script>

<ol class="steps" class:large aria-label={label} data-testid="steps">
	{@render children()}
</ol>

<style>
	.steps {
		display: grid;
		gap: 0;
		margin: 0;
		padding: 0;
		list-style: none;
		min-width: 0;
	}
</style>
