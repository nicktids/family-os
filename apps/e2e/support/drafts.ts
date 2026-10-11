import type { ModelAnswer } from './fake-model.ts';

type Proposal = ModelAnswer['proposals'][number];

/** One proposal for a registered action, as the fake model's extraction answer carries it. */
export function proposal(
	actionId: string,
	input: Record<string, unknown>,
	opts: { dateText?: string; confidence?: number; uncertainFields?: string[] } = {},
): Proposal {
	// A proposal with a date must quote the words that give the day (dateText); the date itself is
	// the simplest quote.
	const dateText =
		opts.dateText ??
		Object.values(input).find(
			(v): v is string => typeof v === 'string' && /^\d{4}-\d\d-\d\d$/.test(v),
		);
	return {
		action: actionId,
		input,
		...(dateText !== undefined && { dateText }),
		confidence: opts.confidence ?? 0.9,
		uncertainFields: opts.uncertainFields ?? [],
	};
}

/** What `model.answer(...)` expects: a summary and the proposals made from the shared item. */
export function answer(summary: string, ...proposals: Proposal[]): ModelAnswer {
	return { summary, proposals };
}

/** The model found a question for the assistant: a label and no proposals. */
export function questionAnswer(summary: string): ModelAnswer {
	return { summary, kind: 'question', proposals: [] };
}
