<script lang="ts" module>
	export type ScheduleUnit = 'none' | 'months' | 'years';
	export interface ScheduleLabels {
		repeat: string;
		none: string;
		months: string;
		years: string;
		every: string;
		unitMonths: string;
		unitYears: string;
		leadDays: string;
	}
</script>

<script lang="ts">
	import { Input } from '../components/input/index.js';

	/**
	 * How often a duty comes back and how many days ahead to be reminded: the two things a preset
	 * only suggests. Used under a ticked preset in the add forms of homes, vehicles and
	 * pets.
	 */
	let {
		repeat = $bindable(),
		interval = $bindable(),
		leadDays = $bindable(),
		labels,
		idPrefix,
	}: {
		repeat: ScheduleUnit;
		interval: number;
		leadDays: number;
		labels: ScheduleLabels;
		idPrefix: string;
	} = $props();
	const field =
		'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border px-2 text-base outline-none focus-visible:ring-3 md:text-sm';
</script>

<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
	<select
		id="{idPrefix}-repeat"
		bind:value={repeat}
		class={field}
		aria-label={labels.repeat}
		data-testid="{idPrefix}-repeat"
	>
		<option value="none">{labels.none}</option>
		<option value="months">{labels.months}</option>
		<option value="years">{labels.years}</option>
	</select>
	{#if repeat !== 'none'}
		<span class="flex items-center gap-2 text-sm">
			<span class="text-ink-soft">{labels.every}</span>
			<Input
				id="{idPrefix}-interval"
				type="number"
				min={1}
				max={repeat === 'years' ? 50 : 120}
				bind:value={interval}
				class="w-20"
				aria-label={labels.every}
				data-testid="{idPrefix}-interval"
			/>
			<span class="text-ink-soft">{repeat === 'years' ? labels.unitYears : labels.unitMonths}</span>
		</span>
	{/if}
	<span class="flex items-center gap-2 text-sm">
		<Input
			id="{idPrefix}-lead"
			type="number"
			min={0}
			max={365}
			bind:value={leadDays}
			class="w-20"
			aria-label={labels.leadDays}
			data-testid="{idPrefix}-lead"
		/>
		<span class="text-ink-soft">{labels.leadDays}</span>
	</span>
</div>
