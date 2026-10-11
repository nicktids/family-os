/**
 * The short name a column or lane heading shows for a person: the first word of their display
 * name ("Sofia" for "Sofia Brandt"). Two people whose first words match keep their whole names,
 * so a heading never stands for two people. The full name stays the accessible name and title.
 */
export function shortName(displayName: string): string {
	const trimmed = displayName.trim();
	return trimmed.split(/\s+/u)[0] || trimmed;
}

/** Each member with `shortName` set: their first word, or the whole name when it is shared. */
export function withShortNames<M extends { displayName: string }>(
	members: readonly M[],
): (M & { shortName: string })[] {
	const count = new Map<string, number>();
	for (const m of members) {
		const key = shortName(m.displayName).toLocaleLowerCase();
		count.set(key, (count.get(key) ?? 0) + 1);
	}
	return members.map((m) => {
		const short = shortName(m.displayName);
		const shared = (count.get(short.toLocaleLowerCase()) ?? 0) > 1;
		return { ...m, shortName: shared ? m.displayName.trim() : short };
	});
}

/**
 * The name a greeting uses for a person ("Good morning, Sofia."): their short name among the
 * family (`withShortNames`), the first word when the family is not known yet.
 */
export function firstName(
	members: readonly { id: string; displayName: string }[],
	person: { id: string; displayName: string } | null | undefined,
): string {
	if (!person) return '';
	const known = members.some((m) => m.id === person.id) ? members : [...members, person];
	return withShortNames(known).find((m) => m.id === person.id)?.shortName ?? '';
}
