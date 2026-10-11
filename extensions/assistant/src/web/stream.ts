/** Answer text received over the WebSocket for answers still being written, by message id. */
export type StreamState = Readonly<Record<string, string>>;

export type StreamEvent =
	| { kind: 'delta'; messageId: string; text: string; reset?: boolean | undefined }
	| { kind: 'done'; messageId: string };

/** A delta appends (or, on a retry, starts over); done forgets the text: the stored answer wins. */
export function reduceStream(state: StreamState, event: StreamEvent): StreamState {
	if (event.kind === 'done') {
		const { [event.messageId]: _gone, ...rest } = state;
		return rest;
	}
	return {
		...state,
		[event.messageId]: event.reset ? event.text : (state[event.messageId] ?? '') + event.text,
	};
}

/** After a reload from the server: keep text only for answers that are still being written. */
export function settleStream(state: StreamState, openIds: ReadonlySet<string>): StreamState {
	const entries = Object.entries(state).filter(([id]) => openIds.has(id));
	return entries.length === Object.keys(state).length ? state : Object.fromEntries(entries);
}
