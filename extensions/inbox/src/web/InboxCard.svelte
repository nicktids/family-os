<script lang="ts">
	import type { SlotProps } from '@famos/ui/slots';
	import { type Draft, loadPendingDrafts } from './data.js';
	import { useInbox } from './i18n.js';
	import NeedsDraftRow from './NeedsDraftRow.svelte';

	/**
	 * Today, Needs you: the suggestions waiting for a decision, decided in place. A person who may
	 * not approve (a supervised member) sees none of them as rows; they get one quiet line.
	 */
	let { size, report }: SlotProps['dashboard.card'] = $props();
	const { app, t } = useInbox();
	let pending = $state<Draft[]>([]);
	let loaded = $state(false);

	async function load() {
		try {
			pending = (await loadPendingDrafts()).toSorted((a, b) => a.createdAt - b.createdAt);
		} catch {
			pending = [];
		} finally {
			loaded = true;
		}
	}
	$effect(() => {
		void load();
		const offDrafts = app.onEvent('core.draft.', () => void load());
		const offItems = app.onEvent('inbox.', () => void load());
		return () => {
			offDrafts();
			offItems();
		};
	});

	const canDecide = $derived(app.can('core.drafts.approve'));
	const shown = $derived(pending.slice(0, 5));
	// Reports only once loaded: the page waits for the first report.
	$effect(() => {
		if (!loaded) return;
		if (canDecide) report({ count: pending.length, quietKey: '', urgent: pending.length });
		else
			report({
				count: 0,
				quietKey: pending.length > 0 ? 'inbox:quiet_waiting_adult' : '',
				quietCount: pending.length,
			});
	});
</script>

{#if canDecide && size !== 'line'}
	{#each shown as draft (draft.id)}
		<NeedsDraftRow {draft} />
	{/each}
	{#if pending.length > shown.length}
		<a href="/add" class="text-ink-soft hover:text-ink block px-4 py-3 text-sm font-semibold"
			>{t('see_all', { count: pending.length })}</a
		>
	{/if}
{/if}
