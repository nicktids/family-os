<script lang="ts">
	import { useApp } from '@famos/ui/app';
	import type { StyleId } from '@famos/ui/styles';
	import { flushSync, type Snippet, untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { compositionFor } from '#lib/today/compositions.js';
	import type { DisplayFit, FitDrop } from '#lib/today/display-fit.js';
	import { TodayData } from '#lib/today/today-data.svelte.js';

	/**
	 * The display's Today: the composition of the display's style in family mode, read
	 * as the display (its view capabilities, through routes a display may call). `status` (the
	 * display's pills) goes in the composition's head; `foot` (the `display.widget` band) where
	 * the composition has room for it, after the day. Made again when "show names" changes, so nothing loaded with names stays on a
	 * display without them.
	 *
	 * A wall display is never scrolled, so the whole page fits one screen, at any size. Once the
	 * composition has settled (and the widgets have stopped growing) it is measured, still hidden,
	 * against plans tried in order of priority until one fits: first fewer things per person
	 * (`tight`), then the widget band whole or a single widget, then blocks left out (the photo,
	 * the atmosphere, the extras, the chores), and only last a little less zoom, never below a
	 * person's own Today. Each plan is tried as it is, then with the style's smaller blocks moved
	 * to where there is room (`shift`). Once one fits, things per person that the space now allows
	 * come back. The head, the next thing and the day always stay. Every plan is applied and
	 * measured in the same task (`flushSync`), so nothing in between is ever painted; it is
	 * measured again whenever the page changes size (live updates, a rotated tablet).
	 */
	let {
		style,
		showNames,
		disabledExtensions,
		hidden,
		reloadKey,
		status,
		foot,
	}: {
		style: StyleId;
		showNames: boolean;
		disabledExtensions: () => readonly string[];
		/** The blocks this display's Today hides (its own choice, else the family's). */
		hidden: () => readonly string[];
		/** Bumped now and then: everything is read again (a live update may have been missed). */
		reloadKey: number;
		status?: Snippet;
		/** The widget band; `shown(i)` says whether its i-th widget is in the plan that fits. */
		foot?: Snippet<[shown: (index: number) => boolean]>;
	} = $props();

	// `showNames` is fixed for this component's life: the page keys it.
	const data = new TodayData(useApp(), {
		familyMode: {
			showNames: untrack(() => showNames),
			disabledExtensions: () => disabledExtensions(),
		},
		hidden: () => hidden(),
	});
	const Composition = $derived(compositionFor(style));

	let lastKey = untrack(() => reloadKey);
	$effect(() => {
		if (reloadKey === lastKey) return;
		lastKey = reloadKey;
		untrack(() => data.reload());
	});

	/* ───────────── fitting one screen ───────────── */

	/** The widgets in the plan: all of them, one (its index) or none. */
	type Widgets = 'all' | 'none' | number;
	interface Plan {
		tight: number;
		drop: readonly FitDrop[];
		widgets: Widgets;
		zoom: number;
		shift: boolean;
	}

	/** No change in size for this long and the widgets have loaded; never longer than the cap. */
	const QUIET_MS = 200;
	const QUIET_CAP_MS = 1500;
	/** The last resort takes the zoom down in small steps, to a person's own Today (1). */
	const ZOOM_STEP = 0.0625;
	const DROPS: readonly (readonly FitDrop[])[] = [
		['photo'],
		['photo', 'atmosphere'],
		['photo', 'atmosphere', 'extras'],
		['photo', 'atmosphere', 'extras', 'chores'],
	];

	/** One type step larger than on a person's screen from 1024 px, a TV-sized screen one more. */
	const baseZoom = (width: number) => (width >= 1800 ? 1.5 : width >= 1024 ? 1.125 : 1);

	/**
	 * The plans, in the order they are tried: each gives up a little more than the one before, and
	 * each is tried as it is, then with the style's smaller blocks moved where there is room.
	 */
	function plans(widgets: readonly number[], zoom: number): Plan[] {
		const out: Omit<Plan, 'shift'>[] = [];
		for (const tight of [0, 1, 2]) out.push({ tight, drop: [], widgets: 'all', zoom });
		for (const i of widgets) out.push({ tight: 2, drop: [], widgets: i, zoom });
		out.push({ tight: 2, drop: [], widgets: 'none', zoom });
		for (const drop of DROPS) out.push({ tight: 2, drop, widgets: 'none', zoom });
		const all = DROPS.at(-1) ?? [];
		out.push({ tight: 3, drop: all, widgets: 'none', zoom });
		for (let z = zoom - ZOOM_STEP; z >= 1 - 1e-6; z -= ZOOM_STEP)
			out.push({ tight: 3, drop: all, widgets: 'none', zoom: z });
		return out.flatMap((plan) => [
			{ ...plan, shift: false },
			{ ...plan, shift: true },
		]);
	}

	let root = $state<HTMLDivElement>();
	let band = $state<HTMLDivElement>();
	let composed = $state(false);
	let hold = $state(true);
	let tight = $state(0);
	const drop = new SvelteSet<FitDrop>();
	let widgets = $state<Widgets>('all');
	let zoom = $state(baseZoom(typeof window === 'undefined' ? 0 : window.innerWidth));
	let shift = $state(false);
	/** The plan that fits, as `data-fit` (for tests and for reading a screenshot). */
	let chosen = $state('');

	const fit: DisplayFit = {
		get tight() {
			return tight;
		},
		drop,
		get shift() {
			return shift;
		},
		get hold() {
			return hold;
		},
		ready: () => {
			composed = true;
		},
	};
	const shown = (index: number) => widgets === 'all' || widgets === index;

	function apply(plan: Plan) {
		tight = plan.tight;
		for (const d of [...drop]) if (!plan.drop.includes(d)) drop.delete(d);
		for (const d of plan.drop) drop.add(d);
		widgets = plan.widgets;
		zoom = plan.zoom;
		shift = plan.shift;
		flushSync();
	}

	/** Everything inside the screen: the page's own padding below, nothing sideways. */
	function fits(el: HTMLElement): boolean {
		const box = el.getBoundingClientRect();
		const below = Number.parseFloat(getComputedStyle(el.parentElement ?? el).paddingBottom) || 0;
		return (
			box.bottom <= window.innerHeight - below + 0.5 &&
			box.right <= window.innerWidth + 0.5 &&
			el.scrollWidth <= el.clientWidth + 1
		);
	}

	/** Tries the plans in order and keeps the first that fits (else the last, the tightest). */
	function fitScreen() {
		const el = root;
		if (!el) return;
		// The widgets that show anything (one with nothing to say is an empty box).
		const present = [...(band?.querySelectorAll(':scope > .widget') ?? [])].flatMap((widget, i) =>
			widget.childElementCount > 0 ? [i] : [],
		);
		const all = plans(present, baseZoom(window.innerWidth));
		let pick = all.at(-1);
		for (const plan of all) {
			apply(plan);
			if (fits(el)) {
				pick = plan;
				break;
			}
		}
		// Giving up blocks may have made room again for things per person: take back what fits.
		for (let t = 0; pick && t < pick.tight; t++) {
			const relaxed = { ...pick, tight: t };
			apply(relaxed);
			if (fits(el)) {
				pick = relaxed;
				break;
			}
		}
		if (pick) {
			apply(pick);
			chosen = `${pick.tight}|${pick.drop.join(',')}|${pick.widgets}|${pick.zoom}${pick.shift ? '|shift' : ''}`;
		}
	}

	// Measured once the composition has settled and the page stops changing size (the widgets
	// load on their own); only then is it shown. Afterwards, again on every change of size.
	let lastChange = 0;
	let frame = 0;
	const later = () => {
		if (frame) return;
		frame = requestAnimationFrame(() => {
			frame = 0;
			fitScreen();
		});
	};
	$effect(() => {
		const el = root;
		if (!el) return;
		const observer = new ResizeObserver(() => {
			lastChange = performance.now();
			if (!untrack(() => hold)) later();
		});
		observer.observe(el);
		const onResize = () => later();
		window.addEventListener('resize', onResize);
		return () => {
			observer.disconnect();
			window.removeEventListener('resize', onResize);
			cancelAnimationFrame(frame);
			frame = 0;
		};
	});
	$effect(() => {
		if (!composed) return;
		const started = performance.now();
		lastChange = Math.max(lastChange, started);
		let timer = 0;
		const check = () => {
			const now = performance.now();
			if (now - lastChange >= QUIET_MS || now - started >= QUIET_CAP_MS) {
				fitScreen();
				hold = false;
			} else timer = window.setTimeout(check, 50);
		};
		timer = window.setTimeout(check, 50);
		return () => clearTimeout(timer);
	});
</script>

<div
	class="today"
	bind:this={root}
	style:zoom
	data-testid="display-today"
	data-names={showNames}
	data-fit={chosen}
>
	<Composition {data} {status} {fit} band={foot ? widgetBand : undefined} />
</div>

{#snippet widgetBand()}
	<div
		class="foot"
		class:pending={hold}
		class:none={widgets === 'none'}
		bind:this={band}
		data-testid="display-foot"
	>
		{@render foot?.(shown)}
	</div>
{/snippet}

<style>
	/* The band of `display.widget` tiles, where the composition puts it (in its order, the whole
	   width of its grid). */
	.foot {
		order: var(--o, 0);
		grid-column: 1 / -1;
		min-width: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
		align-items: start;
		gap: 20px;
	}
	.foot.none,
	.foot:not(:has(> :not(:global(.gone)):not(:empty))) {
		display: none;
	}
	.pending {
		visibility: hidden;
	}
</style>
