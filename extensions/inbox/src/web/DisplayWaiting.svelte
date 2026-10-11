<script lang="ts">
	import { unwrap } from '@famos/api-client';
	import { DisplayPill } from '@famos/ui/famos';
	import { SquarePlus } from '@lucide/svelte';
	import { api } from './api.js';
	import { useInbox } from './i18n.js';

	/**
	 * Family display status pill: how many suggestions wait for a decision. A count
	 * only, and nothing at all when none wait.
	 */
	const { app, t } = useInbox();
	let count = $state(0);

	async function load() {
		try {
			count = unwrap(await api.GET('/api/v1/core/drafts/waiting')).count;
		} catch {
			// Keep what is on screen; the next refresh tries again.
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
</script>

{#if count > 0}
	<DisplayPill alert>
		{#snippet icon()}<SquarePlus />{/snippet}
		{t('display_waiting', { count })}
	</DisplayPill>
{/if}
