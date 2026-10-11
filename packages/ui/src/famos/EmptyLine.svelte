<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * What a section of a page holds when it holds nothing yet (papers, costs, a service log): one
	 * quiet 48 px row with an 18 px icon, one sentence, and an optional link or button at the end.
	 * Whole pages with nothing use `EmptyState` instead.
	 */
	let {
		text,
		icon,
		children,
		testid,
	}: {
		text: string;
		/** The section's icon, drawn at 18 px. */
		icon: Snippet;
		/** An optional quiet action at the end of the line (a link or a text button). */
		children?: Snippet;
		testid?: string;
	} = $props();
</script>

<div
	class="bg-idle text-ink-soft flex min-h-12 items-center gap-2.5 rounded-[var(--r-item)] px-3 text-sm"
	data-testid={testid}
>
	<span class="line-icon grid shrink-0 place-items-center" aria-hidden="true">{@render icon()}</span
	>
	<span class="min-w-0 flex-1">{text}</span>
	{#if children}{@render children()}{/if}
</div>

<style>
	.line-icon :global(svg) {
		width: 18px;
		height: 18px;
	}
</style>
