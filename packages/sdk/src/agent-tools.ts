import { AiContextSchema } from './actions.ts';
import type { Actor } from './actor.ts';
import type { ActionInvoker, ActionResult, DraftMeta } from './context.ts';
import { FamosError } from './errors.ts';
import { type HandleTable, namesUnknownId, repairInput, withHandles } from './handles.ts';

/**
 * What every agent (the in-app assistant, MCP clients) shares when a model
 * calls an action as a tool: handles instead of ids, results wrapped as data, failures that tell
 * the model what to fix without echoing its input, and drafts for every change.
 */

/** A tool result longer than this is cut, so one answer cannot fill the context. */
export const MAX_RESULT_BYTES = 4096;

/**
 * Tool results are data, never instructions: they are wrapped in a block the system
 * prompt names, and anything that could close the block is neutralised.
 */
export function asData(name: string, text: string): string {
	const body = text.replaceAll('</tool_result', '<\\/tool_result');
	let bytes = 0;
	let end = 0;
	// Cut on a character boundary at MAX_RESULT_BYTES of UTF-8 (this package has no TextEncoder).
	for (const ch of body) {
		const code = ch.codePointAt(0) as number;
		bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
		if (bytes > MAX_RESULT_BYTES) {
			return `<tool_result name="${name}">\n${body.slice(0, end)}\n…(shortened)\n</tool_result>`;
		}
		end += ch.length;
	}
	return `<tool_result name="${name}">\n${body}\n</tool_result>`;
}

/** `path: message` pairs from a failed validation, without values (they come from the model). */
function issues(details: unknown): string {
	const tree = details as { errors?: string[]; properties?: Record<string, unknown> } | null;
	const out: string[] = [...(tree?.errors ?? [])];
	for (const [key, value] of Object.entries(tree?.properties ?? {}))
		out.push(`${key}: ${((value as { errors?: string[] }).errors ?? []).join('; ') || 'invalid'}`);
	return out.slice(0, 8).join('; ');
}

/** What a failed call tells the model: enough to fix the input or to say it cannot be done. */
export function toolFailure(error: unknown): string {
	if (error instanceof FamosError) {
		if (error.code === 'bad_request')
			return `Error: invalid input${error.details ? ` (${issues(error.details)})` : ''}`;
		if (error.code === 'forbidden') return 'Error: not allowed for this person';
		if (error.code === 'not_found') return 'Error: not found';
		return `Error: ${error.message}`;
	}
	return 'Error: the tool failed';
}

/** An action's output as the model reads it: ids become handles, and record lists are compact. */
export function readableOutput(output: unknown, table: HandleTable): unknown {
	const context = AiContextSchema.safeParse(output);
	if (context.success) {
		return {
			[context.data.label]: context.data.items.map((item) => ({
				ref: table.add(context.data.kind, item.id),
				name: item.label,
				...(item.details && { details: item.details }),
			})),
		};
	}
	return withHandles(output, table);
}

export interface AgentToolOutcome {
	/** The result as the model reads it (already wrapped by `asData`). */
	text: string;
	/** Whether the action ran (a draft counts); false for refusals and errors. */
	ok: boolean;
	/** Set when the call created a draft. */
	draftId?: string;
}

/**
 * Runs one tool call: handles back to ids (an id the model was never shown is an invented one),
 * the action through the runner (which enforces permissions, the sandbox and approval), and the
 * result back to handles. A draft tool names the draft's source with `draft`.
 */
export async function runAgentTool(call: {
	actions: ActionInvoker;
	actor: Actor;
	table: HandleTable;
	actionId: string;
	kind: 'read' | 'draft';
	input: unknown;
	/** The metadata of the draft this call proposes (draft tools only). */
	draft?: DraftMeta;
	/** What the draft is, for the answer ("a suggestion was created"). */
	draftSummary: string;
}): Promise<AgentToolOutcome> {
	const { actionId, table } = call;
	const input = repairInput(call.input ?? {}, table.toId);
	if (namesUnknownId(input, table))
		return {
			ok: false,
			text: asData(actionId, 'Error: unknown reference; use the handles from earlier results'),
		};
	try {
		const result: ActionResult<unknown> = await call.actions.invoke(
			actionId,
			input,
			call.actor,
			call.kind === 'draft' && call.draft ? { draft: call.draft } : undefined,
		);
		if (result.status === 'drafted') {
			return {
				ok: true,
				draftId: result.draftId,
				text: asData(
					actionId,
					JSON.stringify({
						status: 'drafted',
						note: 'A suggestion was created. Nothing changes until a person approves it.',
						summary: call.draftSummary,
					}),
				),
			};
		}
		return {
			ok: true,
			text: asData(actionId, JSON.stringify(readableOutput(result.output, table))),
		};
	} catch (error) {
		return { ok: false, text: asData(actionId, toolFailure(error)) };
	}
}
