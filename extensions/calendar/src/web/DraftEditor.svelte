<script lang="ts">
	import type { DraftEditorProps } from '@famos/ui/slots';
	import { untrack } from 'svelte';
	import type { EventInput } from '../contract/index.js';
	import EventForm from './EventForm.svelte';
	import { formFrom, inputFrom } from './form.js';

	/** Edits a proposed event inside the Inbox draft card. */
	let { input, uncertain, onchange }: DraftEditorProps<EventInput> = $props();
	// The draft card owns the input from here on; the form is seeded once.
	let value = $state(formFrom(untrack(() => input)));
	$effect(() => onchange(inputFrom(value)));
</script>

<EventForm bind:value {uncertain} idPrefix="draft-event" />
