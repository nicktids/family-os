import { defineWebExtension } from '@famos/ui/slots';
import { SquareCheckBig } from '@lucide/svelte';
import { createChorePresenter, markDonePresenter, setAssigneesPresenter } from './presenters.js';

/**
 * Chores UI: the Chores page (today, overdue, upcoming, one tap to tick off), a Today section and
 * Inbox presenters for suggested chores and splits.
 */
export default defineWebExtension({
	id: 'chores',
	labelKey: 'chores:feature_name',
	descriptionKey: 'chores:feature_description',
	nav: [
		{
			id: 'chores.nav',
			path: '/chores',
			labelKey: 'chores:nav',
			icon: SquareCheckBig,
			placement: 'more',
			group: 'household',
			order: 5,
			requires: 'chores.view',
		},
	],
	pages: [
		{ id: 'chores.page', path: '/chores', component: () => import('./ChoresPage.svelte') },
		// A chore opened in the detail pane (a link opens the same chore).
		{ id: 'chores.chore', path: '/chores/:id', component: () => import('./ChoresPage.svelte') },
	],
	slots: [
		{
			slot: 'dashboard.card',
			id: 'chores.today',
			band: 'notes',
			order: 25,
			glance: true,
			requires: 'chores.use',
			component: () => import('./ChoresCard.svelte'),
		},
	],
	drafts: [createChorePresenter, setAssigneesPresenter, markDonePresenter],
});
