import { unwrap } from '@famos/api-client';
import { sharedRead } from '@famos/ui/famos';
import type {
	AddObligationInput,
	DocumentLabel,
	HistoryEntry,
	Obligation,
	RecordDocument,
} from '../contract/index.js';
import { api } from './api.js';

/** Records API calls, all through the generated client. */
export type Outcome = 'applied' | 'drafted';

export const loadObligations = async (
	recordId: string,
	status: 'open' | 'archived' = 'open',
): Promise<Obligation[]> =>
	unwrap(await api.GET('/api/v1/records/obligations', { params: { query: { recordId, status } } }));

export const loadHistory = async (obligationId: string): Promise<HistoryEntry[]> =>
	unwrap(
		await api.GET('/api/v1/records/obligations/{obligationId}/history', {
			params: { path: { obligationId } },
		}),
	);

/** Shared by the cards that open together on Today. */
export const loadUpcoming = (days = 30): Promise<Obligation[]> =>
	sharedRead(`/api/v1/records/upcoming?days=${days}`, async () =>
		unwrap(await api.GET('/api/v1/records/upcoming', { params: { query: { days } } })),
	);

export const loadDocuments = async (recordId: string): Promise<RecordDocument[]> =>
	unwrap(await api.GET('/api/v1/records/documents', { params: { query: { recordId } } }));

export const documentUrl = (id: string) => `/api/v1/records/documents/${id}/file`;

export type ObligationFields = Omit<
	AddObligationInput,
	'recordId' | 'recordKind' | 'recordName' | 'recordUrl'
>;

export async function addObligation(
	record: Pick<AddObligationInput, 'recordId' | 'recordKind' | 'recordName' | 'recordUrl'>,
	fields: ObligationFields,
): Promise<Outcome> {
	return unwrap(
		await api.POST('/api/v1/actions/records.addObligation', { body: { ...record, ...fields } }),
	).status;
}

export async function updateObligation(id: string, obligation: ObligationFields): Promise<Outcome> {
	return unwrap(
		await api.POST('/api/v1/actions/records.updateObligation', { body: { id, obligation } }),
	).status;
}

export async function completeObligation(
	obligation: Obligation,
	note: string | null,
): Promise<Outcome> {
	return unwrap(
		await api.POST('/api/v1/actions/records.completeObligation', {
			body: { id: obligation.id, dueDate: obligation.dueDate, note },
		}),
	).status;
}

export async function removeObligation(id: string): Promise<Outcome> {
	return unwrap(await api.POST('/api/v1/actions/records.removeObligation', { body: { id } }))
		.status;
}

export async function updateDocument(
	id: string,
	patch: { label?: DocumentLabel; expiresOn?: string | null },
): Promise<Outcome> {
	return unwrap(
		await api.POST('/api/v1/actions/records.updateDocument', { body: { id, ...patch } }),
	).status;
}

export async function detachDocument(id: string): Promise<Outcome> {
	return unwrap(await api.POST('/api/v1/actions/records.detachDocument', { body: { id } })).status;
}
