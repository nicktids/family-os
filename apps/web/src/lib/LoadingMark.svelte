<script lang="ts">
	import { t } from '#lib/i18n.svelte.js';
</script>

<!-- Quiet and late: invisible for the first 800 ms, so a fast load never flashes it. -->
<div class="mark" role="status" data-testid="loading-mark">
	<span class="ring" aria-hidden="true"></span>
	<span class="sr-only">{t('loading')}</span>
</div>

<style>
	.mark {
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
		pointer-events: none;
		opacity: 0;
		animation: mark-in 240ms ease-out 800ms forwards;
	}
	.ring {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 2px solid var(--line);
		border-top-color: var(--ink-soft);
		animation: mark-spin 900ms linear infinite;
	}
	@keyframes mark-in {
		to {
			opacity: 1;
		}
	}
	@keyframes mark-spin {
		to {
			transform: rotate(360deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.ring {
			animation: none;
		}
	}
</style>
