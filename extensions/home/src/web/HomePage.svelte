<script lang="ts">
	import HomeContent from './HomeContent.svelte';
	import HomesShell from './HomesShell.svelte';

	/** The Home page (`/home`) and one home (`/home/:id`): the list of homes beside it, or alone while there is only one. */
	let { params }: { params: Record<string, string> } = $props();
	const homeId = $derived(params.id ?? '');
</script>

<HomesShell selectedId={homeId}>
	{#snippet item()}<HomeContent {homeId} />{/snippet}
</HomesShell>
