import type { Actor } from './actor.ts';

/**
 * Capabilities. Core and every extension declare what they protect; roles are data
 * that grant capabilities. Code only ever asks `can(actor, capability)`.
 */
export const BUILT_IN_ROLES = ['admin', 'member', 'supervised', 'guest'] as const;
export type BuiltInRole = (typeof BUILT_IN_ROLES)[number];

/**
 * What a capability is for. Core maps levels to the built-in roles in this one table, so every
 * extension behaves alike, and a future built-in role is one change here, not one per extension.
 * Without an `edit` capability, a change is proposed as a draft (when the person may propose).
 */
export const CAPABILITY_LEVELS = ['view', 'use', 'edit', 'manage'] as const;
export type CapabilityLevel = (typeof CAPABILITY_LEVELS)[number];

export const LEVEL_DEFAULTS: Readonly<
	Record<CapabilityLevel, Readonly<Record<BuiltInRole, boolean>>>
> = {
	view: { admin: true, member: true, supervised: true, guest: true },
	use: { admin: true, member: true, supervised: true, guest: false },
	edit: { admin: true, member: true, supervised: false, guest: false },
	manage: { admin: true, member: false, supervised: false, guest: false },
};

export interface CapabilityDefinition {
	/** Namespaced by its owner: `calendar.edit`, `core.drafts.approve`. */
	readonly id: string;
	/** i18n key for the roles screen, e.g. `calendar:cap_edit`. */
	readonly label: string;
	readonly level: CapabilityLevel;
	/** Core only: held by the Admin role alone, never by a custom role or with PIN sign-in. */
	readonly critical?: boolean;
	/**
	 * Per-role defaults that do not follow the level. Core may set any (PIN sign-in); an extension
	 * may only remove grants its level gives: each value is `false` or the level's own.
	 */
	readonly defaults?: Readonly<Record<BuiltInRole, boolean>>;
}

const CAPABILITY_ID = /^[a-z][a-z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/;

export function defineCapability(definition: CapabilityDefinition): CapabilityDefinition {
	if (!CAPABILITY_ID.test(definition.id)) {
		throw new Error(
			`Invalid capability id "${definition.id}": use "<owner>.<name>", e.g. "calendar.edit"`,
		);
	}
	return definition;
}

/**
 * Throws when an extension's capability declares defaults that add a grant the level does not give,
 * or declares itself critical. Core is exempt.
 */
export function assertRestrictiveDefaults(owner: string, capability: CapabilityDefinition): void {
	if (owner === 'core') return;
	if (capability.critical)
		throw new Error(`Capability "${capability.id}": only core may declare critical capabilities`);
	if (!capability.defaults) return;
	for (const role of BUILT_IN_ROLES) {
		const value = capability.defaults[role];
		if (value && !LEVEL_DEFAULTS[capability.level][role]) {
			throw new Error(
				`Capability "${capability.id}": defaults may only remove grants, but "${role}" would gain it (level ${capability.level})`,
			);
		}
	}
}

/** Whether a built-in role holds a capability by default. */
export function defaultGrant(capability: CapabilityDefinition, role: BuiltInRole): boolean {
	if (capability.critical) return role === 'admin';
	return (capability.defaults ?? LEVEL_DEFAULTS[capability.level])[role];
}

/** Answers capability questions; provided by core to extensions (`ctx.access`, `uow.can`). */
export interface AccessControl {
	/**
	 * Members: what their role grants. System actors may do everything, except the anonymous one
	 * (source `anonymous`, unauthenticated requests) which holds nothing. AI actors may only read
	 * (`view`) — their changes are always drafts. Displays hold only the `view`
	 * capabilities granted at pairing (and `core.members.view` with "show names").
	 */
	can(actor: Actor, capability: string): boolean;
	/**
	 * Whether the member an AI actor acts for (`onBehalfOf`) holds a capability, whatever its
	 * level: the AI itself only reads, but a draft it proposes must be something that member
	 * could do or propose. True for every other actor (and for an AI acting for nobody).
	 */
	memberCan(actor: Actor, capability: string): boolean;
}
