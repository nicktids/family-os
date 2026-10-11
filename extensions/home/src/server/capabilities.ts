import { defineCapability } from '@famos/sdk';

/** What home protects. `home.view` is also the audience of its reminders. */
export const homeView = defineCapability({
	id: 'home.view',
	label: 'home:cap_view',
	level: 'view',
});
export const homeEdit = defineCapability({
	id: 'home.edit',
	label: 'home:cap_edit',
	level: 'edit',
});
