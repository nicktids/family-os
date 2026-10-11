<script lang="ts">
	import type { Snippet } from 'svelte';
	import { setTodayBlock, type TodayBlockOptions } from './today-block.js';

	/**
	 * Marks what it wraps as one block of Today that can be hidden from its label's `...` menu
	 * (`TodaySection` and `TodayBlockMenu` read it). Without `block` (a display, a preview) the
	 * labels inside have no menu.
	 */
	let { block, children }: { block?: TodayBlockOptions; children: Snippet } = $props();

	// Read through a function, so the label follows a changed name, language or block.
	setTodayBlock(() => block);
</script>

{@render children()}
