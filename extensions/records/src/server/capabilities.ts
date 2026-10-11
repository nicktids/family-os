import { defineCapability } from '@famos/sdk';

/** What records protect. Domain extensions can name `records.view` as an audience. */
export const recordsView = defineCapability({
	id: 'records.view',
	label: 'records:cap_view',
	level: 'view',
});
export const recordsEdit = defineCapability({
	id: 'records.edit',
	label: 'records:cap_edit',
	level: 'edit',
});
