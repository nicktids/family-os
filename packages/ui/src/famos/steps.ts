import { getContext, setContext } from 'svelte';

/** What a `Step` reads from the `Steps` around it. */
export interface StepsContext {
	/** The open step, from 1; a number past the last step means every step is done. */
	readonly current: number;
	readonly large: boolean;
	/** Read by screen readers after a done step's title (already translated). */
	readonly doneLabel: string | undefined;
	/** Set when a done step may be opened again. */
	readonly select: ((n: number) => void) | undefined;
}

const KEY = Symbol('famos-steps');

export function setStepsContext(context: StepsContext): void {
	setContext(KEY, context);
}

export function getStepsContext(): StepsContext {
	const context = getContext<StepsContext | undefined>(KEY);
	if (!context) throw new Error('A Step must be inside Steps.');
	return context;
}

/** Where a step stands against the open one. */
export type StepState = 'done' | 'current' | 'next';

export const stepState = (n: number, current: number): StepState =>
	n < current ? 'done' : n === current ? 'current' : 'next';
