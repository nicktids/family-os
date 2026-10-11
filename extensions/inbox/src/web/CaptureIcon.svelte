<script lang="ts">
	import { Camera, FileText, Mail, PenLine, Send, Share2, Upload, Voicemail } from '@lucide/svelte';
	import type { InboxItem } from '../contract/index.js';

	/** The icon of where a capture came from: its channel, or what it holds when that says more. */
	let { item, class: className = 'size-4' }: { item: InboxItem; class?: string } = $props();

	const Icon = $derived(
		item.channel === 'email'
			? Mail
			: item.channel === 'telegram'
				? Send
				: item.files.some((f) => f.type.startsWith('image/'))
					? Camera
					: item.files.some((f) => f.type.startsWith('audio/'))
						? Voicemail
						: item.files.length
							? FileText
							: item.channel === 'share'
								? Share2
								: item.channel === 'upload'
									? Upload
									: PenLine,
	);
</script>

<Icon class={className} aria-hidden="true" />
