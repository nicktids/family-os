import { defineCapability } from '@famos/sdk';

/**
 * What chores protect. `chores.view` is also the audience of its reminders.
 */
export const choresView = defineCapability({
	id: 'chores.view',
	label: 'chores:cap_view',
	level: 'view',
});
export const choresUse = defineCapability({
	id: 'chores.use',
	label: 'chores:cap_use',
	level: 'use',
});
export const choresEdit = defineCapability({
	id: 'chores.edit',
	label: 'chores:cap_edit',
	level: 'edit',
});
