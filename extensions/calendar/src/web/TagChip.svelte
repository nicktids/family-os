<script lang="ts">
	/** A tag as a small label: a coloured dot and the name. */
	let { name, color, size = 'sm' }: { name: string; color: string; size?: 'sm' | 'lg' } = $props();
</script>

<span
	class="text-ink-soft inline-flex max-w-full items-center gap-1 font-semibold {size === 'lg'
		? 'text-lg'
		: 'text-xs'}"
>
	<span
		class="shrink-0 rounded-full {size === 'lg' ? 'size-3' : 'size-2'}"
		style:background-color={color}
		aria-hidden="true"
	></span>
	<span class="truncate">{name}</span>
</span>
