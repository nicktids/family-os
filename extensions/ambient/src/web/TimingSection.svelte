<script lang="ts">
	import { Card, Section, SettingRow } from '@famos/ui/famos';
	import { Input } from '@famos/ui/input';
	import type { AmbientSettings } from '../contract/index.js';
	import { saveTiming } from './data.js';
	import { useAmbient } from './i18n.js';

	/** Photos and weather: when ambient mode starts and how long a photo stays. Saved as you go. */
	const { app, t } = useAmbient();
	let {
		settings,
		onsaved,
	}: { settings: AmbientSettings; onsaved: (settings: AmbientSettings) => void } = $props();

	// svelte-ignore state_referenced_locally (the fields start from the saved values)
	let idleMinutes = $state(settings.timing.idleMinutes);
	// svelte-ignore state_referenced_locally (the fields start from the saved values)
	let slideSeconds = $state(settings.timing.slideSeconds);
	let failed = $state(false);

	async function save() {
		failed = false;
		if (
			idleMinutes === settings.timing.idleMinutes &&
			slideSeconds === settings.timing.slideSeconds
		)
			return;
		try {
			onsaved(await saveTiming({ idleMinutes, slideSeconds }));
			app.toast(t('timing_saved'));
		} catch {
			failed = true;
		}
	}
</script>

<Section label={t('timing_title')}>
	<Card rows>
		<SettingRow label={t('timing_idle')} for="timing-idle" hint={t('timing_intro')}>
			{#snippet control()}
				<Input
					id="timing-idle"
					type="number"
					min={1}
					max={240}
					step={1}
					bind:value={idleMinutes}
					onchange={save}
					required
				/>
			{/snippet}
		</SettingRow>
		<SettingRow label={t('timing_slide')} for="timing-slide">
			{#snippet control()}
				<Input
					id="timing-slide"
					type="number"
					min={5}
					max={600}
					step={1}
					bind:value={slideSeconds}
					onchange={save}
					required
				/>
			{/snippet}
		</SettingRow>
	</Card>
	{#if failed}<p class="text-attention text-sm font-semibold" role="alert">{t('error')}</p>{/if}
</Section>
