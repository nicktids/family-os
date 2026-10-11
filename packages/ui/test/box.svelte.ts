/** A reactive props object: change a field after mounting and the component updates. */
export function box<T extends object>(initial: T): T {
	const state = $state(initial);
	return state;
}
