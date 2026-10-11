/**
 * The small rules of the Quick add page that do not need a component: what a way in (Telegram,
 * email) says about itself, and which dropped or pasted files the box takes.
 */

/**
 * - `ready`: it works; nothing more to say.
 * - `link`: the family has it, but this person has not linked their own account yet.
 * - `setup`: not set up, and this person may set it up (a "Set up" link).
 * - `waiting`: not set up, and someone else has to ("Not set up yet").
 * - `unknown`: not known yet (or the question failed); say nothing rather than guess.
 */
export type WayStatus = 'ready' | 'link' | 'setup' | 'waiting' | 'unknown';

export function wayStatus(
	available: boolean | null | undefined,
	canManage: boolean,
	linked = true,
): WayStatus {
	if (available == null) return 'unknown';
	if (!available) return canManage ? 'setup' : 'waiting';
	return linked ? 'ready' : 'link';
}

/** Whether `type` matches one of `accept` (`image/*`, `application/pdf`, …), like a file input. */
export function accepts(type: string, accept: readonly string[]): boolean {
	const t = type.toLowerCase();
	return accept.some((a) => (a.endsWith('/*') ? t.startsWith(a.slice(0, -1)) : t === a));
}

/**
 * Adds dropped or pasted files to the ones already chosen: only kinds the box takes, and no more
 * than `max` in all. Returns how many were left out, so the box can say so.
 */
export function addFiles(
	current: readonly File[],
	incoming: Iterable<File>,
	accept: readonly string[],
	max: number,
): { files: File[]; refused: number } {
	const files = [...current];
	let refused = 0;
	for (const file of incoming) {
		if (!accepts(file.type, accept) || files.length >= max) refused += 1;
		else files.push(file);
	}
	return { files, refused };
}

/** Whether a drag carries files (not text or a link being moved inside the page). */
export const dragHasFiles = (types: readonly string[] | undefined): boolean =>
	Boolean(types?.includes('Files'));
