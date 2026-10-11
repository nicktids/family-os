<script lang="ts" generics="S extends SlotName">
	import type { Component } from 'svelte';
	import { useApp } from './app-context.js';
	import { trackWork } from './famos/work.svelte.js';
	import type { SlotContribution, SlotName, SlotProps } from './slots.js';

	/**
	 * Renders the contributions to a slot. Without `contributions` it asks the app for the
	 * enabled ones (`useApp().slots`), which is what an extension's page does.
	 */
	let {
		name,
		contributions,
		props = {} as SlotProps[S],
	}: { name: S; contributions?: readonly SlotContribution[]; props?: SlotProps[S] } = $props();

	// Only needed when the caller gives no contributions; outside the app there is no context.
	const app = (() => {
		try {
			return useApp();
		} catch {
			return null;
		}
	})();

	const items = $derived(
		(
			(contributions ?? app?.slots(name) ?? []).filter(
				(c) => c.slot === name,
			) as SlotContribution<S>[]
		).toSorted((a, b) => (a.order ?? 0) - (b.order ?? 0)),
	);

	// The generic ties props to the slot; the component type is a union at this point.
	const passed = $derived(props as Record<string, unknown>);
	// The code of a contribution is loaded lazily; the page is not done opening until it has
	// arrived (and asked for its data), so the load counts as work (`trackWork`).
	const load = (item: SlotContribution<S>) =>
		trackWork(
			item.component() as unknown as Promise<{ default: Component<Record<string, unknown>> }>,
		);
</script>

{#each items as item (item.id)}
	{#await load(item) then mod}
		<mod.default {...passed} />
	{/await}
{/each}
