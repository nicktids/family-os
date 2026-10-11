<script lang="ts">
	import { openPath } from '@famos/ui/famos';
	import { listPagePath, rememberedListPage } from './lists-page.js';

	// `/lists` (the phone's Lists tab) opens the list page used last on this device. It replaces
	// this entry in the history, so Back does not land here again.
	$effect(() => {
		openPath(listPagePath(rememberedListPage()), { replace: true });
	});
</script>
