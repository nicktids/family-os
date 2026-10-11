<script lang="ts">
	import { Pill, Row, Section } from '@famos/ui/famos';
	import CaptureIcon from './CaptureIcon.svelte';
	import { captureTime } from './format.js';
	import { useInbox } from './i18n.js';
	import { type Capture, captureLine, itemChip } from './item-view.js';

	/**
	 * The person's last captures with how each went. A list you can open, not a place to work:
	 * opening one shows it in the side panel. Nothing at all when there is no history yet.
	 */
	let {
		captures,
		selectedId = null,
		onselect,
	}: {
		captures: readonly Capture[];
		selectedId?: string | null;
		onselect: (id: string) => void;
	} = $props();
	const { app, t } = useInbox();

	const TONE = {
		attention: 'attention',
		now: 'now',
		info: 'info',
		idle: 'default',
	} as const;
</script>

{#if captures.length}
	<Section label={t('recent')}>
		<ul class="grid gap-1.5">
			{#each captures as { item, drafts } (item.id)}
				{@const chip = itemChip(item, drafts)}
				<li>
					<Row
						tile
						data-testid="recent-row"
						selected={selectedId === item.id}
						onclick={() => onselect(item.id)}
						title={captureLine(item)}
						meta={captureTime(app, item.createdAt)}
					>
						{#snippet lead()}
							<span class="bg-idle text-ink-soft grid size-9 place-items-center rounded-full">
								<CaptureIcon {item} />
							</span>
						{/snippet}
						{#snippet trail()}
							<Pill tone={TONE[chip.tone]}
								>{t(chip.key, chip.count === undefined ? undefined : { count: chip.count })}</Pill
							>
						{/snippet}
					</Row>
				</li>
			{/each}
		</ul>
	</Section>
{/if}
