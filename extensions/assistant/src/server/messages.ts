import type { Message } from '../contract/index.ts';
import type { MessageRow } from './store.ts';

export type StoredToolCall = { name: string; ok: boolean; draftId?: string };

function toolCallsOf(row: Pick<MessageRow, 'tool_calls'>): StoredToolCall[] {
	if (!row.tool_calls) return [];
	try {
		return JSON.parse(row.tool_calls) as StoredToolCall[];
	} catch {
		return [];
	}
}

export const toMessage = (row: MessageRow): Message => ({
	id: row.id,
	role: row.role,
	content: row.content,
	toolCalls: toolCallsOf(row),
	status: row.status,
	errorCode: row.error_code,
	createdAt: row.created_at,
});
