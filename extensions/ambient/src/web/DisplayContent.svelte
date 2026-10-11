<script lang="ts">
	import { onMount } from 'svelte';
	import type { AmbientSettings } from '../contract/index.js';
	import { loadSettings } from './data.js';
	import { useAmbient } from './i18n.js';
	import PhotosSection from './PhotosSection.svelte';
	import TimingSection from './TimingSection.svelte';
	import WeatherSection from './WeatherSection.svelte';

	/**
	 * Settings, Photos and weather: the photos and the weather that Today and family
	 * displays show, and the slideshow's timing. The weather is the only external call a display
	 * causes, so it is explained here.
	 */
	const { t } = useAmbient();
	let settings = $state<AmbientSettings | null>(null);
	let failed = $state(false);

	onMount(async () => {
		try {
			settings = await loadSettings();
		} catch {
			failed = true;
		}
	});
</script>

<div class="grid gap-7" id="display-content">
	<p class="text-ink-soft max-w-[62ch] px-1 text-sm">{t('subtitle')}</p>
	{#if failed}
		<p class="text-attention font-semibold" role="alert">{t('error')}</p>
	{:else if settings}
		<PhotosSection />
		<WeatherSection {settings} onsaved={(next) => (settings = next)} />
		<TimingSection {settings} onsaved={(next) => (settings = next)} />
	{/if}
</div>
