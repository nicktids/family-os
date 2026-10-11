<script lang="ts">
	import type { Snippet } from 'svelte';
	import { untrack } from 'svelte';
	import { family } from '#lib/family.svelte.js';
	import LoadingMark from '#lib/LoadingMark.svelte';
	import { netActivity, shellState } from '#lib/net-activity.svelte.js';
	import { session } from '#lib/session.svelte.js';

	/**
	 * One page, shown once: the page is mounted at once (so it starts loading) but stays invisible
	 * until its first data is in, then appears whole, head and body together, with a 120 ms fade
	 * (the "Loading" state). "First data" is every read that was started while
	 * the page opened, plus the family settings and the language of the shell, so a capability, a
	 * list name or a setup state that arrives a moment later is part of it. Slow loads show a quiet
	 * indicator after 800 ms; a load that never settles reveals the page after 6 s. Later updates
	 * (live events, actions) never hide the page again.
	 */
	let { children }: { children: Snippet } = $props();

	const GIVE_UP = 6000;
	let revealed = $state(false);

	function reveal() {
		revealed = true;
	}

	// Signed out (sign-in, setup) there is no family or language to wait for.
	const shellDone = $derived(
		session.status !== 'ready' || (family.loaded && shellState.languageReady),
	);
	const settled = $derived(netActivity.pending === 0 && shellDone);

	// Two frames of quiet: a response may start the next read (a list, then its name) in the same
	// tick it is handled, and the page paints what it just got before we look again.
	$effect(() => {
		if (revealed || !settled) return;
		let second = 0;
		const first = requestAnimationFrame(() => {
			second = requestAnimationFrame(() => {
				if (untrack(() => settled)) reveal();
			});
		});
		// Background tabs do not run frames.
		const fallback = setTimeout(() => {
			if (untrack(() => settled)) reveal();
		}, 400);
		return () => {
			cancelAnimationFrame(first);
			cancelAnimationFrame(second);
			clearTimeout(fallback);
		};
	});
	$effect(() => {
		const timer = setTimeout(reveal, GIVE_UP);
		return () => clearTimeout(timer);
	});
</script>

<div
	class="gate"
	class:pending={!revealed}
	class:revealed
	data-testid="page-gate"
	data-ready={revealed}
>
	{@render children()}
</div>
{#if !revealed}<LoadingMark />{/if}

<style>
	.gate {
		display: contents;
	}
	/* Transparent, not hidden: the page keeps its layout and can still take focus as it opens. */
	.gate.pending > :global(*) {
		opacity: 0;
		pointer-events: none;
	}
	.gate.revealed > :global(*) {
		animation: gate-in 120ms ease-out;
	}
	@keyframes gate-in {
		from {
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.gate.revealed > :global(*) {
			animation: none;
		}
	}
</style>
