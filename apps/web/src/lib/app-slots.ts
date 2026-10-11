import type { SlotContribution } from '@famos/ui/slots';

/**
 * Contributions the app itself makes to slots (an extension never owns these). The navigation
 * puts the notifications bell into `today.head` here, for phones, whose bell lives in the page
 * head of Today:
 *
 * ```ts
 * { slot: 'today.head', id: 'app.bell', component: () => import('./NotificationsBell.svelte') }
 * ```
 *
 * Ids are namespaced `app.<name>`; the app is never "turned off" like an extension.
 */
export const appSlotContributions: SlotContribution[] = [
	{ slot: 'today.head', id: 'app.bell', component: () => import('./TodayBell.svelte') },
];
