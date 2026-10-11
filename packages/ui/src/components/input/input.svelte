<script lang="ts">
	import { cn, type WithElementRef } from "../../utils.js";
	import type { HTMLInputAttributes, HTMLInputTypeAttribute } from "svelte/elements";

	type InputType = Exclude<HTMLInputTypeAttribute, "file">;

	type Props = WithElementRef<
		Omit<HTMLInputAttributes, "type"> &
			({ type: "file"; files?: FileList } | { type?: InputType; files?: undefined })
	>;

	let {
		ref = $bindable(null),
		value = $bindable(),
		type,
		files = $bindable(),
		class: className,
		"data-slot": dataSlot = "input",
		...restProps
	}: Props = $props();
</script>

{#if type === "file"}
	<input
		bind:this={ref}
		data-slot={dataSlot}
		class={cn(
			"bg-surface in-data-[surface=card]:bg-wall text-ink border-line focus-visible:border-info focus-visible:ring-info/25 aria-invalid:border-attention aria-invalid:border-[1.5px] aria-invalid:ring-0 h-[var(--ctl)] rounded-[var(--r-ctl)] border px-3 text-[15px] transition-[color,box-shadow] file:h-7 file:text-sm file:font-medium focus-visible:ring-3 w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent file:text-foreground placeholder:text-ink-soft/80 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
			className
		)}
		type="file"
		bind:files
		bind:value
		{...restProps}
	/>
{:else}
	<input
		bind:this={ref}
		data-slot={dataSlot}
		class={cn(
			"bg-surface in-data-[surface=card]:bg-wall text-ink border-line focus-visible:border-info focus-visible:ring-info/25 aria-invalid:border-attention aria-invalid:border-[1.5px] aria-invalid:ring-0 h-[var(--ctl)] rounded-[var(--r-ctl)] border px-3 text-[15px] transition-[color,box-shadow] file:h-7 file:text-sm file:font-medium focus-visible:ring-3 w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent file:text-foreground placeholder:text-ink-soft/80 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
			className
		)}
		{type}
		bind:value
		{...restProps}
	/>
{/if}
