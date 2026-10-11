<script lang="ts">
	import { useApp } from '@famos/ui/app';
	import { segments } from './render.js';

	/** An answer as text: line breaks kept, in-app paths linked, nothing else interpreted. */
	let { text }: { text: string } = $props();
	const app = useApp();
	const parts = $derived(segments(text, (path) => app.isAppPath(path)));
</script>

<p class="break-words whitespace-pre-wrap">
	{#each parts as part, i (i)}{#if part.kind === 'link'}<a
				href={part.href}
				class="font-semibold underline">{part.text}</a
			>{:else}{part.text}{/if}{/each}
</p>
