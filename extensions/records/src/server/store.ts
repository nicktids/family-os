import type { DbExecutor, Migrations } from '@famos/sdk';
import { sql } from 'kysely';
import type { HistoryEntry, Obligation, RecordDocument } from '../contract/index.ts';
import { fromRule } from './recurrence.ts';

/** Storage for records (tables prefixed `records_`). */
export type RecordsTables = {
	records_obligations: {
		id: string;
		/** Typed id of the record in its owning extension; no foreign key. */
		record_id: string;
		record_kind: string;
		/** The record's name and page, kept up to date by its owner (`records.renameRecord`). */
		record_name: string;
		record_url: string | null;
		/** A preset id of the domain, or `custom`. */
		kind: string;
		title: string;
		/** Next due date (YYYY-MM-DD); moves forward when a repeating obligation is completed. */
		due_date: string;
		/** `FREQ=MONTHLY|YEARLY;INTERVAL=n`, or null for a one-off. */
		rrule: string | null;
		/** First due date of the series; occurrences are counted from it. */
		rrule_start: string | null;
		lead_days: number;
		assignee_id: string | null;
		/** Capability whose holders are reminded when nobody is assigned. */
		audience: string;
		notes: string | null;
		/** 1 for a date that only passes (a warranty ends): never overdue, gone once past. */
		lapses: number;
		last_done_on: string | null;
		archived_at: number | null;
		source_kind: string | null;
		source_id: string | null;
		created_by: string | null;
		created_at: number;
		updated_at: number;
	};
	records_obligation_history: {
		id: string;
		obligation_id: string;
		due_date: string;
		done_on: string;
		done_by: string | null;
		note: string | null;
		created_at: number;
	};
	records_documents: {
		id: string;
		record_id: string;
		record_kind: string;
		/** A key of the file store, under `inbox/<item id>/`: the file stays where the Inbox put it. */
		file_key: string;
		name: string;
		type: string;
		size: number;
		label: 'policy' | 'invoice' | 'card' | 'receipt' | 'other';
		expires_on: string | null;
		source_item_id: string | null;
		created_by: string | null;
		created_at: number;
		updated_at: number;
		archived_at: number | null;
	};
};
export type ObligationRow = RecordsTables['records_obligations'];
export type HistoryRow = RecordsTables['records_obligation_history'];
export type DocumentRow = RecordsTables['records_documents'];

export const migrations: Migrations = {
	'0001_init': {
		async up(db) {
			await db.schema
				.createTable('records_obligations')
				.addColumn('id', 'text', (c) => c.primaryKey())
				.addColumn('record_id', 'text', (c) => c.notNull())
				.addColumn('record_kind', 'text', (c) => c.notNull())
				.addColumn('record_name', 'text', (c) => c.notNull())
				.addColumn('record_url', 'text')
				.addColumn('kind', 'text', (c) => c.notNull())
				.addColumn('title', 'text', (c) => c.notNull())
				.addColumn('due_date', 'text', (c) => c.notNull())
				.addColumn('rrule', 'text')
				.addColumn('rrule_start', 'text')
				.addColumn('lead_days', 'integer', (c) => c.notNull().defaultTo(14))
				.addColumn('assignee_id', 'text')
				.addColumn('audience', 'text', (c) => c.notNull().defaultTo('records.view'))
				.addColumn('notes', 'text')
				.addColumn('last_done_on', 'text')
				.addColumn('archived_at', 'integer')
				.addColumn('source_kind', 'text')
				.addColumn('source_id', 'text')
				.addColumn('created_by', 'text')
				.addColumn('created_at', 'integer', (c) => c.notNull())
				.addColumn('updated_at', 'integer', (c) => c.notNull())
				.modifyEnd(sql`strict`)
				.execute();
			await db.schema
				.createIndex('records_obligations_record_idx')
				.on('records_obligations')
				.columns(['record_id', 'archived_at'])
				.execute();
			await db.schema
				.createIndex('records_obligations_due_idx')
				.on('records_obligations')
				.columns(['archived_at', 'due_date'])
				.execute();

			await db.schema
				.createTable('records_obligation_history')
				.addColumn('id', 'text', (c) => c.primaryKey())
				.addColumn('obligation_id', 'text', (c) =>
					c.notNull().references('records_obligations.id').onDelete('cascade'),
				)
				.addColumn('due_date', 'text', (c) => c.notNull())
				.addColumn('done_on', 'text', (c) => c.notNull())
				.addColumn('done_by', 'text')
				.addColumn('note', 'text')
				.addColumn('created_at', 'integer', (c) => c.notNull())
				.modifyEnd(sql`strict`)
				.execute();
			await db.schema
				.createIndex('records_obligation_history_idx')
				.on('records_obligation_history')
				.columns(['obligation_id', 'created_at'])
				.execute();

			await db.schema
				.createTable('records_documents')
				.addColumn('id', 'text', (c) => c.primaryKey())
				.addColumn('record_id', 'text', (c) => c.notNull())
				.addColumn('record_kind', 'text', (c) => c.notNull())
				.addColumn('file_key', 'text', (c) => c.notNull())
				.addColumn('name', 'text', (c) => c.notNull())
				.addColumn('type', 'text', (c) => c.notNull())
				.addColumn('size', 'integer', (c) => c.notNull())
				.addColumn('label', 'text', (c) => c.notNull())
				.addColumn('expires_on', 'text')
				.addColumn('source_item_id', 'text')
				.addColumn('created_by', 'text')
				.addColumn('created_at', 'integer', (c) => c.notNull())
				.addColumn('updated_at', 'integer', (c) => c.notNull())
				.addColumn('archived_at', 'integer')
				.modifyEnd(sql`strict`)
				.execute();
			await db.schema
				.createIndex('records_documents_record_idx')
				.on('records_documents')
				.columns(['record_id', 'archived_at'])
				.execute();
			await db.schema
				.createIndex('records_documents_file_idx')
				.on('records_documents')
				.columns(['record_id', 'file_key'])
				.unique()
				.execute();
		},
	},
	'0002_lapses': {
		async up(db) {
			await db.schema
				.alterTable('records_obligations')
				.addColumn('lapses', 'integer', (c) => c.notNull().defaultTo(0))
				.execute();
		},
	},
};

export const tables = (db: DbExecutor) => db.withTables<RecordsTables>();

export function toObligation(row: ObligationRow): Obligation {
	return {
		id: row.id,
		recordId: row.record_id,
		recordKind: row.record_kind,
		recordName: row.record_name,
		recordUrl: row.record_url,
		kind: row.kind,
		title: row.title,
		dueDate: row.due_date,
		every: fromRule(row.rrule),
		rrule: row.rrule,
		leadDays: row.lead_days,
		assigneeId: row.assignee_id,
		audience: row.audience,
		notes: row.notes,
		lapses: row.lapses === 1,
		lastDoneOn: row.last_done_on,
		archivedAt: row.archived_at,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

export function toHistory(row: HistoryRow): HistoryEntry {
	return {
		id: row.id,
		obligationId: row.obligation_id,
		dueDate: row.due_date,
		doneOn: row.done_on,
		doneBy: row.done_by,
		note: row.note,
		createdAt: row.created_at,
	};
}

export function toDocument(row: DocumentRow): RecordDocument {
	return {
		id: row.id,
		recordId: row.record_id,
		recordKind: row.record_kind,
		name: row.name,
		type: row.type,
		size: row.size,
		label: row.label,
		expiresOn: row.expires_on,
		sourceItemId: row.source_item_id,
		createdBy: row.created_by,
		createdAt: row.created_at,
	};
}
