<script lang="ts">
	import { Step, Steps } from '../../src/famos/index.js';

	/** Three steps for the Steps tests; `current` and `onselect` come from the test. */
	let { current, onselect }: { current: number; onselect?: ((n: number) => void) | undefined } =
		$props();
</script>

<Steps {current} {onselect} label="Add a screen" doneLabel="done">
	<Step n={1} title="Open the address" summary="example.org/display">
		<p>Open it on the screen.</p>
	</Step>
	<Step n={2} title="Type the code" summary="Code ABCD-EFGH">
		<input id="code" />
		<button type="button">Next</button>
	</Step>
	<Step n={3} title="Done">
		<p>All set.</p>
	</Step>
</Steps>
