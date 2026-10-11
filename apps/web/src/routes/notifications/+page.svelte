<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '@famos/ui/button';
	import { Card, Page, PageHeader, Section } from '@famos/ui/famos';
	import { t } from '#lib/i18n.svelte.js';
	import { ago } from '#lib/ago.js';
	import { notifications, type NotificationItem } from '#lib/notifications.svelte.js';
	import { onEvent } from '#lib/realtime.js';
	import { session } from '#lib/session.svelte.js';

	/** Every recent notification; the phone's destination from the bell on Today. */
	$effect(() => {
		if (session.status !== 'ready') return;
		void notifications.load(50);
		return onEvent('core.notification.', () => void notifications.load(50));
	});

	async function open(item: NotificationItem) {
		if (!item.read) await notifications.markRead([item.id]);
		if (item.url) await goto(item.url);
	}
</script>

<Page template="list">
	<PageHeader title={t('notifications_title')}>
		{#snippet actions()}
			<Button
				variant="outline"
				disabled={notifications.unread === 0}
				onclick={() => notifications.markRead()}
			>
				{t('notifications_mark_all_read')}
			</Button>
		{/snippet}
	</PageHeader>

	<div class="grid gap-8">
		{#if notifications.error}
			<p class="text-attention font-semibold" role="alert">{t('error_generic')}</p>
		{/if}

		{#if notifications.items.length === 0}
			<p class="text-ink-soft max-w-prose px-1">{t('notifications_empty')}</p>
		{:else}
			<Section label={t('notifications_recent')}>
				<Card rows>
					{#each notifications.items as item (item.id)}
						<button
							type="button"
							class="flex min-h-13 w-full items-start gap-3 px-4 py-3 text-left"
							onclick={() => open(item)}
						>
							<span
								class="mt-2 size-2.5 shrink-0 rounded-full {item.read
									? 'bg-transparent'
									: 'bg-attention'}"
								aria-hidden="true"
							></span>
							<span class="grid min-w-0 flex-1 gap-0.5">
								<span class={item.read ? 'font-medium' : 'font-bold'}>
									{item.title}
									{#if !item.read}<span class="sr-only"> · {t('notifications_unread')}</span>{/if}
								</span>
								{#if item.body}<span class="text-ink-soft text-sm">{item.body}</span>{/if}
								<small class="text-ink-soft text-xs">{ago(item.createdAt)}</small>
							</span>
						</button>
					{/each}
				</Card>
			</Section>
		{/if}

		<p>
			<a
				href="/settings/notifications"
				class="text-ink-soft hover:text-ink text-sm font-semibold underline underline-offset-4"
				>{t('nav_notification_settings')}</a
			>
		</p>
	</div>
</Page>
