import { defineCapability } from '@famos/sdk';

/** What vehicles protect. `vehicles.view` is also the audience of its reminders. */
export const vehiclesView = defineCapability({
	id: 'vehicles.view',
	label: 'vehicles:cap_view',
	level: 'view',
});
export const vehiclesEdit = defineCapability({
	id: 'vehicles.edit',
	label: 'vehicles:cap_edit',
	level: 'edit',
});
