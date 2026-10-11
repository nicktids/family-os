<script lang="ts">
	import { Page, PageHeader } from '@famos/ui/famos';
	import { useCalendar } from './i18n.js';
	import SubscriptionsSection from './SubscriptionsSection.svelte';
	import TagsSection from './TagsSection.svelte';

	/**
	 * Settings, Family: the calendars shown next to the family's (subscriptions, managers only) and
	 * the tags on events (everyone who can edit events).
	 */
	const { app, t } = useCalendar();
</script>

<Page template="settings">
	<PageHeader title={t('calendars_title')} subtitle={t('calendars_subtitle')} />

	<div class="grid gap-8">
		{#if app.can('calendar.manage')}<SubscriptionsSection />{/if}
		{#if app.can('calendar.edit')}<TagsSection />{/if}
	</div>
</Page>
