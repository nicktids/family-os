<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * Page title row (Ev Işığı): the title at the style's page size (type.css), an optional
	 * subtitle, actions on the right.
	 */
	let { title, subtitle, actions }: { title: string; subtitle?: string; actions?: Snippet } =
		$props();
</script>

<header class="mb-6 flex flex-wrap items-end gap-x-4 gap-y-2">
	<div class="grid gap-1">
		<h1 class="type-page text-balance">{title}</h1>
		{#if subtitle}<p class="text-ink-soft max-w-prose">{subtitle}</p>{/if}
	</div>
	{#if actions}<div class="ml-auto flex items-center gap-2">{@render actions()}</div>{/if}
</header>
