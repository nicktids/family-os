<script lang="ts">
	import { type Draft, loadAnswerDrafts } from './data.js';
	import DraftView from './DraftView.svelte';
	import { useAssistant } from './i18n.js';

	/** The suggestions one answer created, as normal draft cards. */
	let { messageId, ids }: { messageId: string; ids: readonly string[] } = $props();
	const { app, t } = useAssistant();
	let drafts = $state<Draft[]>([]);
	let failed = $state(false);

	async function load() {
		try {
			drafts = await loadAnswerDrafts(messageId, ids);
			failed = false;
		} catch {
			failed = true;
		}
	}
	$effect(() => {
		void load();
		return app.onEvent('core.draft.', () => void load());
	});
</script>

<div class="mt-3 grid gap-3">
	{#each drafts as draft (draft.id)}
		<DraftView {draft} />
	{/each}
	{#if failed && drafts.length === 0}
		<p class="text-ink-soft text-sm">
			{t('suggestion_created')} ·
			<a href="/add" class="font-semibold underline">{t('open_quick_add')}</a>
		</p>
	{/if}
</div>
