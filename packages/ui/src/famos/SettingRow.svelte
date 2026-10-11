<script lang="ts">
	import type { Snippet } from 'svelte';
	import HelpTip from './HelpTip.svelte';

	/**
	 * One setting on a settings card: its name and a one-line explanation on the left, the
	 * control on the right (stacked under it on narrow screens). Longer explanations go in `help`,
	 * shown behind a "?" so the page stays short. Put rows in a `Card` with `rows`. From 32 rem of
	 * the container's width the control gets a 20 rem column on the right (a container query, never
	 * the window); `inline` keeps it beside the label below that too, for switches.
	 */
	let {
		label,
		for: forId,
		hint,
		help,
		helpLabel = '?',
		inline = false,
		control,
		children,
	}: {
		label: string;
		/** The id of the control, so the label focuses it. */
		for?: string;
		hint?: string;
		help?: string;
		/** Accessible name of the "?" button (translated by the page). */
		helpLabel?: string;
		/** Keep a small control (a switch) at the right of the label even in a narrow container. */
		inline?: boolean;
		control: Snippet;
		/** Extra content under the row (a preview, an error). */
		children?: Snippet;
	} = $props();
</script>

<div class="@container">
	<div
		class="grid items-center gap-x-6 gap-y-2.5 px-4 py-3 @lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] @lg:px-5 @lg:py-3.5 {inline
			? 'grid-cols-[minmax(0,1fr)_auto]'
			: ''}"
	>
		<div class="grid min-w-0 gap-0.5">
			<span class="flex items-center gap-2">
				{#if forId}<label for={forId} class="font-semibold">{label}</label>{:else}<span
						class="font-semibold">{label}</span
					>{/if}
				{#if help}<HelpTip text={help} label={helpLabel} />{/if}
			</span>
			{#if hint}<small class="text-ink-soft text-sm leading-snug">{hint}</small>{/if}
		</div>
		<div class="min-w-0 {inline ? 'flex justify-end' : ''}">{@render control()}</div>
		{#if children}<div class="col-span-full">{@render children()}</div>{/if}
	</div>
</div>
