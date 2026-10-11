<script lang="ts">
	import { Button } from '@famos/ui/button';
	import { ConfirmButton } from '@famos/ui/famos';
	import { dismissItem, type FileChoice, fileItem } from './data.js';
	import CaptureIcon from './CaptureIcon.svelte';
	import CaptureSource from './CaptureSource.svelte';
	import CaptureStatus from './CaptureStatus.svelte';
	import DraftView from './DraftView.svelte';
	import FileTargetPicker from './FileTargetPicker.svelte';
	import { captureTime } from './format.js';
	import { useInbox } from './i18n.js';
	import { type Capture, captureLine } from './item-view.js';

	/**
	 * An earlier capture in the side panel: the original, how it went, the suggestions that were
	 * decided (with Undo while possible), filing the papers on a record, Try again and Remove.
	 */
	let {
		capture,
		onchanged,
		onclose,
	}: { capture: Capture; onchanged?: () => void; onclose: () => void } = $props();
	const { app, t } = useInbox();

	const item = $derived(capture.item);
	const reading = $derived(item.status === 'received' || item.status === 'normalized');

	let fileTo = $state<FileChoice | null>(null);
	let filing = $state(false);
	const canFile = $derived(item.files.length > 0 && item.status !== 'filed');
	async function file() {
		if (!fileTo) return;
		filing = true;
		try {
			await fileItem(item.id, fileTo);
			fileTo = null;
			app.toast(t('filed'));
			onchanged?.();
		} catch {
			app.toast(t('error_file'));
		} finally {
			filing = false;
		}
	}
	async function remove() {
		try {
			await dismissItem(item.id);
			onchanged?.();
			onclose();
		} catch {
			app.toast(t('error'));
		}
	}
</script>

<article class="grid gap-5" aria-label={captureLine(item)} data-testid="capture-detail">
	<header class="grid gap-1">
		<h3 class="text-lg leading-snug font-extrabold text-balance">{captureLine(item)}</h3>
		<p class="text-ink-soft flex items-center gap-2 text-sm">
			<CaptureIcon {item} />
			<span>{t(`channel_${item.channel}`)} · {captureTime(app, item.createdAt)}</span>
		</p>
	</header>

	<section class="bg-idle rounded-xl p-4" aria-label={t('original')}>
		<CaptureSource {item} />
	</section>

	<CaptureStatus {item} showFound />

	{#if canFile && !reading}
		<div class="grid gap-2">
			<FileTargetPicker bind:value={fileTo} openLabel={t('file_into')} />
			{#if fileTo}
				<Button onclick={file} disabled={filing} class="justify-self-start"
					>{t('file_confirm', { name: fileTo.recordName })}</Button
				>
			{/if}
		</div>
	{/if}

	{#if capture.drafts.length}
		<section class="grid gap-2" aria-labelledby="detail-suggestions">
			<h4
				id="detail-suggestions"
				class="text-ink-soft text-xs font-semibold tracking-widest uppercase"
			>
				{t('suggestions')}
			</h4>
			{#each capture.drafts as draft (draft.id)}
				<DraftView {draft} compact />
			{/each}
		</section>
	{/if}

	{#if !reading}
		<div class="flex justify-end border-t pt-3">
			<ConfirmButton label={t('dismiss')} confirmLabel={t('dismiss_confirm')} onconfirm={remove} />
		</div>
	{/if}
</article>
