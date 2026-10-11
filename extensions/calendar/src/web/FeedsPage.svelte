<script lang="ts">
	import { Page, PageHeader } from '@famos/ui/famos';
	import FeedsSection from './FeedsSection.svelte';
	import { useCalendar } from './i18n.js';

	/** Settings, You: the calendar on my phone. Open to everyone who can see the calendar. */
	const { t } = useCalendar();
</script>

<Page template="settings">
	<PageHeader title={t('feeds_title')} />
	<FeedsSection />
</Page>
