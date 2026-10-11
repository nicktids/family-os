<script lang="ts">
	import { qrPath } from './qr.js';

	/**
	 * A QR code for an address. It keeps dark modules on a light square in the night theme too
	 * (`.day`): a QR code needs the contrast.
	 */
	let {
		text,
		label,
		class: className = '',
		testid,
	}: { text: string; label: string; class?: string; testid?: string } = $props();

	const qr = $derived(qrPath(text));
</script>

<div class="day rounded-xl {className}" data-testid={testid}>
	<svg
		viewBox="0 0 {qr.side} {qr.side}"
		class="bg-surface block h-auto w-full rounded-xl"
		role="img"
		aria-label={label}
		shape-rendering="crispEdges"
	>
		<path d={qr.path} class="fill-ink" />
	</svg>
</div>
