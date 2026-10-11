import ambient from '@famos/ext-ambient/server';
import assistant from '@famos/ext-assistant/server';
import board from '@famos/ext-board/server';
import calendar from '@famos/ext-calendar/server';
import chores from '@famos/ext-chores/server';
import home from '@famos/ext-home/server';
import inbox from '@famos/ext-inbox/server';
import kitchen from '@famos/ext-kitchen/server';
import lists from '@famos/ext-lists/server';
import pets from '@famos/ext-pets/server';
import records from '@famos/ext-records/server';
import vehicles from '@famos/ext-vehicles/server';
import type { ExtensionDefinition } from '@famos/sdk';

/**
 * Installed extensions.
 * Core is always loaded by the kernel and is not listed.
 */
export const extensions: readonly ExtensionDefinition[] = [
	calendar,
	chores,
	lists,
	inbox,
	records,
	home,
	pets,
	vehicles,
	kitchen,
	board,
	ambient,
	assistant,
];
