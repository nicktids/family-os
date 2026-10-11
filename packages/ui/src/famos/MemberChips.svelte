<script lang="ts">
	import type { PresenterMember } from '../slots.js';
	import Avatar from './Avatar.svelte';

	/**
	 * Pick family members as avatar chips. `multiple` toggles any number; otherwise one member or,
	 * when `noneLabel` is set, nobody (shown as a first chip, e.g. "Anyone").
	 */
	let {
		members,
		selected = $bindable(),
		multiple = false,
		noneLabel,
	}: {
		members: readonly PresenterMember[];
		selected: string[];
		multiple?: boolean;
		noneLabel?: string;
	} = $props();

	function toggle(id: string) {
		if (multiple) {
			selected = selected.includes(id) ? selected.filter((m) => m !== id) : [...selected, id];
		} else {
			selected = selected[0] === id && noneLabel ? [] : [id];
		}
	}

	const chip = (on: boolean) =>
		`flex min-h-11 items-center gap-2 rounded-full py-1 pr-3.5 pl-1 text-sm font-bold transition-colors ${on ? 'bg-surface text-ink shadow-lit ring-2' : 'bg-idle text-ink-soft'}`;
</script>

<div class="flex flex-wrap gap-2">
	{#if noneLabel && !multiple}
		<button
			type="button"
			aria-pressed={selected.length === 0}
			onclick={() => (selected = [])}
			class="{chip(selected.length === 0)} pl-3.5 ring-[var(--ink-soft)]"
		>
			{noneLabel}
		</button>
	{/if}
	{#each members as member (member.id)}
		{@const on = selected.includes(member.id)}
		<button
			type="button"
			aria-pressed={on}
			onclick={() => toggle(member.id)}
			class={chip(on)}
			style:--tw-ring-color={member.color}
		>
			<Avatar name={member.displayName} color={member.color} size={30} />
			{member.displayName}
		</button>
	{/each}
</div>
