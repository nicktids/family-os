import type { AccessControl, Actor, AnyActionDefinition } from '@famos/sdk';

/**
 * Whether an AI actor may use an action as a tool. An AI acting for nobody (the
 * Inbox) is judged elsewhere. One acting for a member never exceeds that member:
 * - a read tool needs the action's `requires` through `access.can` (the AI's own limits and the
 *   member's capabilities);
 * - a draft tool needs the member to hold `requires`, and to be able to approve the change
 *   (`approval.unless`) or at least propose it (`core.drafts.propose`), like a person.
 */
export function mayUseAsAi(access: AccessControl, def: AnyActionDefinition, actor: Actor): boolean {
	if (actor.kind !== 'ai' || actor.onBehalfOf === undefined) return true;
	if (def.readOnly) return def.requires === undefined || access.can(actor, def.requires);
	if (def.requires && !access.memberCan(actor, def.requires)) return false;
	if (typeof def.approval === 'object') {
		return (
			access.memberCan(actor, def.approval.unless) || access.memberCan(actor, 'core.drafts.propose')
		);
	}
	return true;
}
