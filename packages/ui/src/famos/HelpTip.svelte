<script lang="ts">
	/**
	 * A small "?" next to a setting that opens a longer explanation, for what does not fit in the
	 * one line under it. Click or Enter opens it, Escape or a click elsewhere closes it; the text
	 * is announced as the button's description.
	 */
	let { text, label }: { text: string; label: string } = $props();
	let open = $state(false);
	const id = `help-${Math.random().toString(36).slice(2, 9)}`;
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') open = false;
	}}
	onpointerdown={(e) => {
		if (open && !(e.target as Element).closest(`[data-help="${id}"]`)) open = false;
	}}
/>

<span class="relative inline-flex align-middle" data-help={id}>
	<button
		type="button"
		aria-label={label}
		aria-expanded={open}
		aria-describedby={open ? id : undefined}
		onclick={() => (open = !open)}
		class="text-ink-soft hover:text-ink focus-visible:ring-ring grid size-6 place-items-center rounded-full border text-xs font-bold outline-none focus-visible:ring-2"
		>?</button
	>
	{#if open}
		<span
			{id}
			role="tooltip"
			class="bg-surface text-ink shadow-lit absolute top-full left-1/2 z-40 mt-2 w-72 max-w-[80vw] -translate-x-1/2 rounded-xl border p-3 text-sm leading-relaxed font-normal"
			>{text}</span
		>
	{/if}
</span>
