<script lang="ts">
	import { Button } from '@famos/ui/button';
	import { Input } from '@famos/ui/input';
	import type { DraftEditorProps } from '@famos/ui/slots';
	import { Plus, X } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import { type AddShoppingItemsInput, CATEGORIES, type Category } from '../contract/index.js';
	import { useLists } from './i18n.js';

	/** Edits proposed shopping items inside the Inbox draft card: rename, quantity, section, remove. */
	let { input, onchange }: DraftEditorProps<AddShoppingItemsInput> = $props();
	const { t } = useLists();

	type Row = { title: string; quantity: string; category: Category | '' };
	let rows = $state<Row[]>(
		untrack(() =>
			input.items.map((i) => ({
				title: i.title,
				quantity: i.quantity ?? '',
				category: i.category ?? '',
			})),
		),
	);
	$effect(() => {
		const items = rows
			.filter((r) => r.title.trim())
			.map((r) => ({
				title: r.title.trim(),
				quantity: r.quantity.trim() || null,
				...(r.category && { category: r.category }),
			}));
		onchange({ ...(input.listId && { listId: input.listId }), items });
	});
</script>

<ul class="grid gap-2">
	{#each rows as row, index (index)}
		<li
			class="grid grid-cols-[1fr_5.5rem_auto] items-center gap-2 sm:grid-cols-[1fr_5.5rem_10rem_auto]"
		>
			<Input
				bind:value={row.title}
				aria-label={t('field_title')}
				maxlength={120}
				autocomplete="off"
			/>
			<Input
				bind:value={row.quantity}
				aria-label={t('field_quantity')}
				maxlength={40}
				autocomplete="off"
			/>
			<select
				bind:value={row.category}
				aria-label={t('field_category')}
				class="border-input col-span-2 h-9 rounded-md border bg-transparent px-2 text-base sm:col-span-1 md:text-sm"
			>
				<option value="">–</option>
				{#each CATEGORIES as category (category)}<option value={category}
						>{t(`cat_${category}`)}</option
					>{/each}
			</select>
			<Button
				variant="ghost"
				size="icon"
				aria-label={t('delete')}
				onclick={() => rows.splice(index, 1)}><X /></Button
			>
		</li>
	{/each}
</ul>
<Button
	variant="ghost"
	class="mt-2"
	onclick={() => rows.push({ title: '', quantity: '', category: '' })}
	><Plus />{t('add_item')}</Button
>
