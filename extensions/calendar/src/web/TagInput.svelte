<script lang="ts">
	import { X } from '@lucide/svelte';
	import { MAX_TAG_LENGTH, MAX_TAGS, normalizeTags, type Tag } from '../contract/index.js';
	import { useCalendar } from './i18n.js';
	import TagChip from './TagChip.svelte';
	import { colorOf, suggestTags } from './tags.js';

	/**
	 * Tags of one event: chips you can remove, a field to type a new one (Enter or comma adds it),
	 * and the family's existing tags as suggestions.
	 */
	let {
		value = $bindable(),
		known = [],
		id,
	}: { value: string[]; known?: readonly Tag[]; id: string } = $props();

	const { t } = useCalendar();
	let typed = $state('');
	const full = $derived(value.length >= MAX_TAGS);
	const suggestions = $derived(full ? [] : suggestTags(known, value, typed));

	function add(raw: string) {
		value = normalizeTags([...value, raw]);
		typed = '';
	}

	function commit() {
		if (typed.trim()) add(typed);
		else typed = '';
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ',') {
			// Enter must not submit the event form.
			event.preventDefault();
			commit();
		} else if (event.key === 'Backspace' && typed === '' && value.length > 0) {
			value = value.slice(0, -1);
		}
	}

	const remove = (name: string) => (value = value.filter((v) => v !== name));
</script>

<div class="grid gap-2">
	{#if value.length}
		<ul class="flex flex-wrap gap-2" aria-label={t('field_tags')}>
			{#each value as name (name)}
				<li class="bg-idle flex min-h-9 items-center gap-1 rounded-full py-1 ps-3 pe-1">
					<TagChip {name} color={colorOf(known, name)} />
					<button
						type="button"
						class="text-ink-soft hover:text-ink grid size-7 place-items-center rounded-full"
						aria-label={t('tag_remove', { name })}
						onclick={() => remove(name)}
					>
						<X class="size-4" />
					</button>
				</li>
			{/each}
		</ul>
	{/if}
	<input
		{id}
		type="text"
		bind:value={typed}
		{onkeydown}
		onblur={commit}
		maxlength={MAX_TAG_LENGTH}
		disabled={full}
		autocomplete="off"
		placeholder={full ? t('tags_full', { max: MAX_TAGS }) : t('tags_placeholder')}
		class="border-input h-9 w-full rounded-md border bg-transparent px-2 text-base md:text-sm"
	/>
	{#if suggestions.length}
		<ul class="flex flex-wrap gap-2" aria-label={t('tags_suggestions')}>
			{#each suggestions as tag (tag.name)}
				<li>
					<button
						type="button"
						class="bg-idle hover:bg-surface min-h-9 rounded-full px-3"
						onmousedown={(e) => e.preventDefault()}
						onclick={() => add(tag.name)}
					>
						<TagChip name={tag.name} color={tag.color} />
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
