<script lang="ts">
	import { dateTimeFormat } from '#lib/format.svelte.js';
	import { CloudOff, X } from '@lucide/svelte';
	import { t } from '#lib/i18n.svelte.js';
	import { offline } from '#lib/offline.svelte.js';

	const failedTime = (at: number) =>
		dateTimeFormat({ hour: '2-digit', minute: '2-digit' }).format(new Date(at));
</script>

{#if offline.showingOld || offline.waiting.length > 0 || offline.failed.length > 0}
	<div class="mb-4 grid gap-2" data-testid="offline-status">
		{#if offline.showingOld}
			<p
				class="bg-idle text-ink-soft flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold"
				role="status"
				data-testid="offline-banner"
			>
				<CloudOff class="size-4 shrink-0" aria-hidden="true" />{t('offline_banner')}
			</p>
		{/if}
		{#if offline.waiting.length > 0}
			<p
				class="bg-idle text-ink flex flex-wrap items-center gap-x-2 rounded-lg px-3 py-2 text-sm font-semibold"
				role="status"
				data-testid="offline-waiting"
			>
				{t('offline_waiting', { count: offline.waiting.length })}
				<small class="text-ink-soft font-normal">{t('offline_waiting_hint')}</small>
			</p>
		{/if}
		{#if offline.failed.length > 0}
			<section
				class="bg-surface shadow-lit grid gap-2 rounded-lg p-3"
				aria-labelledby="offline-failed-title"
				data-testid="offline-failed"
			>
				<div class="flex items-center gap-2">
					<h2 id="offline-failed-title" class="text-attention text-sm font-bold">
						{t('offline_failed_title', { count: offline.failed.length })}
					</h2>
					<button
						type="button"
						class="text-ink-soft hover:text-ink ml-auto min-h-11 px-2 text-sm font-semibold"
						onclick={() => offline.dismissFailed()}
					>
						{t('offline_failed_dismiss_all')}
					</button>
				</div>
				<ul class="grid gap-1.5">
					{#each offline.failed as change (change.key)}
						<li class="flex items-start gap-2 text-sm">
							<span class="min-w-0 flex-1">
								<span class="font-bold">{change.label ?? t('offline_failed_generic')}</span>
								<span class="text-ink-soft"> · {failedTime(change.failedAt)}</span>
								<span class="text-ink-soft block">{change.message}</span>
							</span>
							<button
								type="button"
								class="text-ink-soft hover:text-ink grid size-11 shrink-0 place-items-center"
								aria-label={t('offline_failed_dismiss')}
								onclick={() => offline.dismissFailed(change.key)}
							>
								<X class="size-4" />
							</button>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>
{/if}
