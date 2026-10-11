<script lang="ts">
	import { FileText } from '@lucide/svelte';
	import type { InboxItem } from '../contract/index.js';
	import { fileUrl } from './data.js';
	import { useInbox } from './i18n.js';

	/**
	 * What a capture was made of: the text, photos, voice notes with what was said, and files.
	 * Photos and files open in a new tab.
	 */
	let { item }: { item: InboxItem } = $props();
	const { t } = useInbox();

	const indexed = $derived(item.files.map((f, i) => ({ ...f, i })));
	const images = $derived(indexed.filter((f) => f.type.startsWith('image/')));
	const audio = $derived(indexed.filter((f) => f.type.startsWith('audio/')));
	const others = $derived(
		indexed.filter((f) => !f.type.startsWith('image/') && !f.type.startsWith('audio/')),
	);
	const text = $derived([item.title, item.text, item.url].filter(Boolean).join('\n'));
	let moreText = $state(false);
	let moreTranscript = $state(false);
	const longText = $derived(text.length > 500 || text.split('\n').length > 6);
	const longTranscript = $derived((item.transcript?.length ?? 0) > 280);
</script>

<div class="grid gap-3">
	{#if text}
		<div class="grid gap-1">
			<p
				class="max-w-prose text-sm whitespace-pre-wrap {longText && !moreText
					? 'line-clamp-6'
					: ''}"
			>
				{text}
			</p>
			{#if longText}
				<button
					type="button"
					class="text-ink-soft min-h-9 justify-self-start text-xs font-semibold underline-offset-4 hover:underline"
					aria-expanded={moreText}
					onclick={() => (moreText = !moreText)}
					>{moreText ? t('message_less') : t('message_more')}</button
				>
			{/if}
		</div>
	{/if}
	{#if images.length}
		<div class="flex flex-wrap gap-2">
			{#each images as image (image.i)}
				<a
					href={fileUrl(item.id, image.i)}
					target="_blank"
					rel="noopener"
					aria-label={t('open_file', { name: image.name })}
				>
					<img
						src={fileUrl(item.id, image.i)}
						alt={image.name}
						loading="lazy"
						class="bg-idle size-24 rounded-lg object-cover"
					/>
				</a>
			{/each}
		</div>
	{/if}
	{#each audio as file (file.i)}
		<!-- svelte-ignore a11y_media_has_caption -->
		<audio
			controls
			preload="none"
			src={fileUrl(item.id, file.i)}
			aria-label="{t('voice_note')}: {file.name}"
			class="w-full max-w-md"
		></audio>
	{/each}
	{#if item.transcript}
		<div class="bg-idle grid gap-1 rounded-lg p-3 text-sm">
			<span class="text-ink-soft text-xs font-semibold">{t('transcript')}</span>
			<p class="whitespace-pre-wrap {longTranscript && !moreTranscript ? 'line-clamp-3' : ''}">
				{item.transcript}
			</p>
			{#if longTranscript}
				<button
					type="button"
					class="text-ink-soft min-h-9 justify-self-start text-xs font-semibold underline-offset-4 hover:underline"
					aria-expanded={moreTranscript}
					onclick={() => (moreTranscript = !moreTranscript)}
					>{moreTranscript ? t('transcript_less') : t('transcript_more')}</button
				>
			{/if}
		</div>
	{/if}
	{#if others.length}
		<ul class="flex flex-wrap gap-2">
			{#each others as file (file.i)}
				<li>
					<a
						href={fileUrl(item.id, file.i)}
						target="_blank"
						rel="noopener"
						class="bg-idle flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold"
						><FileText class="size-4" aria-hidden="true" /><span class="max-w-48 truncate"
							>{file.name}</span
						></a
					>
				</li>
			{/each}
		</ul>
	{/if}
</div>
