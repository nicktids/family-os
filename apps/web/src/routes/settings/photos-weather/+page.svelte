<script lang="ts">
	import { goto } from '$app/navigation';
	import { Page, PageHeader } from '@famos/ui/famos';
	import Slot from '@famos/ui/slot';
	import { t } from '#lib/i18n.svelte.js';
	import { session } from '#lib/session.svelte.js';

	/**
	 * Photos and weather: what the `settings.display` slot offers (the ambient
	 * extension's photos, the weather and the slideshow's timing), on a page of its own under
	 * Family. Devices links here.
	 */
	const allowed = $derived(
		session.can('ambient.manage') && !session.disabledExtensions.includes('ambient'),
	);
	$effect(() => {
		if (session.status === 'ready' && !allowed) void goto('/', { replaceState: true });
	});
</script>

<Page template="settings">
	<PageHeader title={t('nav_photos_weather')} />

	<div class="grid gap-7">
		<Slot name="settings.display" />
	</div>
</Page>
