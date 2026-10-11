<script lang="ts">
	import { openPath } from '@famos/ui/famos';
	import type { InboxItem } from '../contract/index.js';
	import CaptureBox from './CaptureBox.svelte';

	/** Today, for a family that has just started: the capture box, the fastest way in. After "Read it" the person follows the capture on the Quick add page. */
	function sent(_item: InboxItem) {
		openPath('/add');
	}
</script>

<CaptureBox onsent={sent} id="quick-add-text-today" />
