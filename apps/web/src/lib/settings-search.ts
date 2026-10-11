/**
 * The settings list's search: a filter over the rows' labels as
 * the person types, groups without a match drop out. A list filter, not a full-text index.
 */
export function filterSettings<S, I>(
	groups: readonly { section: S; items: readonly I[] }[],
	query: string,
	label: (item: I) => string,
): { section: S; items: I[] }[] {
	const q = query.trim().toLocaleLowerCase();
	return groups
		.map((g) => ({
			section: g.section,
			items: q ? g.items.filter((i) => label(i).toLocaleLowerCase().includes(q)) : [...g.items],
		}))
		.filter((g) => g.items.length > 0);
}
