<script lang="ts">
	import type { LayoutProps } from './$types';

	/** The settings frame (sections on the left on wide windows) lives in the root layout. */
	let { children }: LayoutProps = $props();
</script>

{@render children()}
