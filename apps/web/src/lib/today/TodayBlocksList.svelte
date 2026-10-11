<script lang="ts">
	import { Card, Segmented, SwitchRow } from '@famos/ui/famos';
	import { t, tDynamic } from '#lib/i18n.svelte.js';
	import { shows, type TodayBlock, withBlock } from './blocks.js';

	/**
	 * "What Today shows": a switch per block with one line on what it is (show or hide only; the
	 * style arranges what is left). With `follow`, a choice between following the family and an
	 * own choice comes first, like the style; changing a switch while following makes the choice
	 * one's own, starting from the family's.
	 */
	let {
		id,
		blocks,
		hidden,
		onchange,
		follow,
		disabled = false,
	}: {
		/** Prefix of the switches' ids (unique on the page). */
		id: string;
		blocks: readonly TodayBlock[];
		/** What is hidden now (own, else followed). */
		hidden: readonly string[];
		/** The new list of hidden blocks (`null`: follow the family). */
		onchange: (hidden: string[] | null) => void;
		/** Whether the choice is one's own, and the words of the two options. */
		follow?: { own: boolean; followLabel: string; ownLabel: string };
		disabled?: boolean;
	} = $props();

	const options = $derived(
		follow
			? [
					{ value: 'family', label: follow.followLabel },
					{ value: 'own', label: follow.ownLabel },
				]
			: [],
	);
</script>

<div class="grid gap-3">
	{#if follow}
		<Segmented
			grow
			label={t('blocks_title')}
			{options}
			value={follow.own ? 'own' : 'family'}
			onchange={(value) => onchange(value === 'own' ? [...hidden] : null)}
		/>
	{/if}
	<Card rows>
		{#each blocks as block (block.id)}
			<SwitchRow
				id="{id}-{block.id}"
				label={tDynamic(block.labelKey)}
				hint={block.hintKey ? tDynamic(block.hintKey) : undefined}
				checked={shows(hidden, block.id)}
				{disabled}
				onchange={(checked) => onchange(withBlock(hidden, block.id, checked))}
			/>
		{/each}
	</Card>
</div>
