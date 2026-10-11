import type { DbExecutor, Migrations } from '@famos/sdk';
import { sql } from 'kysely';
import type { Fuel, LogKind, Vehicle, VehicleLog } from '../contract/index.ts';

/** Storage for vehicles (tables prefixed `vehicles_`). */
export type VehiclesTables = {
	vehicles_vehicles: {
		id: string;
		name: string;
		plate: string;
		make: string;
		model: string;
		year: number | null;
		fuel: Fuel;
		vin: string | null;
		/** JSON array of member ids. */
		member_ids: string;
		notes: string | null;
		created_by: string | null;
		created_at: number;
		updated_at: number;
		archived_at: number | null;
	};
	vehicles_logs: {
		id: string;
		vehicle_id: string;
		kind: LogKind;
		done_on: string;
		place: string | null;
		notes: string | null;
		/** A `records` document (`record_doc_…`) such as the invoice; no foreign key. */
		document_id: string | null;
		created_by: string | null;
		created_at: number;
	};
};
export type VehicleRow = VehiclesTables['vehicles_vehicles'];
export type LogRow = VehiclesTables['vehicles_logs'];

export const migrations: Migrations = {
	'0001_init': {
		async up(db) {
			await db.schema
				.createTable('vehicles_vehicles')
				.addColumn('id', 'text', (c) => c.primaryKey())
				.addColumn('name', 'text', (c) => c.notNull())
				.addColumn('plate', 'text', (c) => c.notNull().defaultTo(''))
				.addColumn('make', 'text', (c) => c.notNull().defaultTo(''))
				.addColumn('model', 'text', (c) => c.notNull().defaultTo(''))
				.addColumn('year', 'integer')
				.addColumn('fuel', 'text', (c) => c.notNull().defaultTo('other'))
				.addColumn('vin', 'text')
				.addColumn('member_ids', 'text', (c) => c.notNull().defaultTo('[]'))
				.addColumn('notes', 'text')
				.addColumn('created_by', 'text')
				.addColumn('created_at', 'integer', (c) => c.notNull())
				.addColumn('updated_at', 'integer', (c) => c.notNull())
				.addColumn('archived_at', 'integer')
				.modifyEnd(sql`strict`)
				.execute();
			await db.schema
				.createIndex('vehicles_vehicles_active_idx')
				.on('vehicles_vehicles')
				.columns(['archived_at', 'created_at'])
				.execute();

			await db.schema
				.createTable('vehicles_logs')
				.addColumn('id', 'text', (c) => c.primaryKey())
				.addColumn('vehicle_id', 'text', (c) =>
					c.notNull().references('vehicles_vehicles.id').onDelete('cascade'),
				)
				.addColumn('kind', 'text', (c) => c.notNull())
				.addColumn('done_on', 'text', (c) => c.notNull())
				.addColumn('place', 'text')
				.addColumn('notes', 'text')
				.addColumn('document_id', 'text')
				.addColumn('created_by', 'text')
				.addColumn('created_at', 'integer', (c) => c.notNull())
				.modifyEnd(sql`strict`)
				.execute();
			await db.schema
				.createIndex('vehicles_logs_vehicle_idx')
				.on('vehicles_logs')
				.columns(['vehicle_id', 'done_on'])
				.execute();
		},
	},
};

export const tables = (db: DbExecutor) => db.withTables<VehiclesTables>();

export function toVehicle(row: VehicleRow): Vehicle {
	return {
		id: row.id,
		name: row.name,
		plate: row.plate,
		make: row.make,
		model: row.model,
		year: row.year,
		fuel: row.fuel,
		vin: row.vin,
		memberIds: JSON.parse(row.member_ids) as string[],
		notes: row.notes,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

export function toLog(row: LogRow): VehicleLog {
	return {
		id: row.id,
		vehicleId: row.vehicle_id,
		kind: row.kind,
		doneOn: row.done_on,
		place: row.place,
		notes: row.notes,
		documentId: row.document_id,
		createdBy: row.created_by,
		createdAt: row.created_at,
	};
}
