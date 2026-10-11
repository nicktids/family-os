import { defineCapability } from '@famos/sdk';

/** What pets protect. `pets.view` is also the audience of its reminders. */
export const petsView = defineCapability({
	id: 'pets.view',
	label: 'pets:cap_view',
	level: 'view',
});
export const petsEdit = defineCapability({
	id: 'pets.edit',
	label: 'pets:cap_edit',
	level: 'edit',
});
