import { defineCapability } from '@famos/sdk';

/**
 * Talking to the assistant. `use` level: Guests do not have it by default. What the assistant can
 * look up or propose is never wider than what the asking member may see and do.
 */
export const assistantUse = defineCapability({
	id: 'assistant.use',
	label: 'assistant:cap_use',
	level: 'use',
});
