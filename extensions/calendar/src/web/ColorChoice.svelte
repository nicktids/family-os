<script lang="ts">
	import { SUBSCRIPTION_COLORS } from '../contract/index.js';

	/** A row of colour swatches, one chosen (a radio group); 44 px targets. */
	let {
		value = $bindable(),
		name,
		legend,
	}: { value: string; name: string; legend: string } = $props();
</script>

<fieldset class="grid gap-2">
	<legend class="text-sm font-semibold">{legend}</legend>
	<div class="flex flex-wrap gap-2">
		{#each SUBSCRIPTION_COLORS as swatch (swatch)}
			<label
				class="has-[:focus-visible]:ring-info grid size-11 cursor-pointer place-items-center rounded-full has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-2 {value ===
				swatch
					? 'ring-ink ring-2 ring-offset-2'
					: ''}"
				style:background-color={swatch}
			>
				<input type="radio" class="sr-only" {name} value={swatch} bind:group={value} />
				<span class="sr-only">{swatch}</span>
			</label>
		{/each}
	</div>
</fieldset>
