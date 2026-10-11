<script lang="ts">
	import type { SlotProps } from '@famos/ui/slots';
	import { Sparkles } from '@lucide/svelte';
	import { useAssistant } from './i18n.js';

	/** Today, the foot of the page: one tap to the assistant, cursor ready in its message box. */
	let { report }: SlotProps['dashboard.card'] = $props();
	const { t } = useAssistant();
	$effect(() => report({ count: 1, quietKey: '' }));
</script>

<a
	href="/assistant?ask=1"
	class="text-ink-soft hover:text-ink focus-visible:ring-ring flex min-h-11 items-center gap-2.5 rounded-xl px-1.5 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
>
	<Sparkles class="text-attention size-4 shrink-0" aria-hidden="true" />
	<span>{t('ask')}<span class="sr-only"> · {t('ask_hint')}</span></span>
</a>
