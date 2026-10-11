import type { DbExecutor, Migrations } from '@famos/sdk';
import { sql } from 'kysely';
import type { Pet, PetTreatment, Sex, Species, TreatmentKind } from '../contract/index.ts';

/** Storage for pets (tables prefixed `pets_`). */
export type PetsTables = {
	pets_pets: {
		id: string;
		name: string;
		species: Species;
		breed: string;
		sex: Sex | null;
		birth_date: string | null;
		chip_number: string | null;
		/** Clinic and phone, free text. */
		vet: string;
		/** JSON array of member ids. */
		member_ids: string;
		notes: string | null;
		created_by: string | null;
		created_at: number;
		updated_at: number;
		archived_at: number | null;
	};
	pets_treatments: {
		id: string;
		pet_id: string;
		kind: TreatmentKind;
		given_on: string;
		product: string;
		batch: string | null;
		vet: string | null;
		notes: string | null;
		/** A `records` document (`record_doc_…`) such as the vet card; no foreign key. */
		document_id: string | null;
		created_by: string | null;
		created_at: number;
	};
};
export type PetRow = PetsTables['pets_pets'];
export type TreatmentRow = PetsTables['pets_treatments'];

export const migrations: Migrations = {
	'0001_init': {
		async up(db) {
			await db.schema
				.createTable('pets_pets')
				.addColumn('id', 'text', (c) => c.primaryKey())
				.addColumn('name', 'text', (c) => c.notNull())
				.addColumn('species', 'text', (c) => c.notNull().defaultTo('other'))
				.addColumn('breed', 'text', (c) => c.notNull().defaultTo(''))
				.addColumn('sex', 'text')
				.addColumn('birth_date', 'text')
				.addColumn('chip_number', 'text')
				.addColumn('vet', 'text', (c) => c.notNull().defaultTo(''))
				.addColumn('member_ids', 'text', (c) => c.notNull().defaultTo('[]'))
				.addColumn('notes', 'text')
				.addColumn('created_by', 'text')
				.addColumn('created_at', 'integer', (c) => c.notNull())
				.addColumn('updated_at', 'integer', (c) => c.notNull())
				.addColumn('archived_at', 'integer')
				.modifyEnd(sql`strict`)
				.execute();
			await db.schema
				.createIndex('pets_pets_active_idx')
				.on('pets_pets')
				.columns(['archived_at', 'created_at'])
				.execute();

			await db.schema
				.createTable('pets_treatments')
				.addColumn('id', 'text', (c) => c.primaryKey())
				.addColumn('pet_id', 'text', (c) =>
					c.notNull().references('pets_pets.id').onDelete('cascade'),
				)
				.addColumn('kind', 'text', (c) => c.notNull())
				.addColumn('given_on', 'text', (c) => c.notNull())
				.addColumn('product', 'text', (c) => c.notNull().defaultTo(''))
				.addColumn('batch', 'text')
				.addColumn('vet', 'text')
				.addColumn('notes', 'text')
				.addColumn('document_id', 'text')
				.addColumn('created_by', 'text')
				.addColumn('created_at', 'integer', (c) => c.notNull())
				.modifyEnd(sql`strict`)
				.execute();
			await db.schema
				.createIndex('pets_treatments_pet_idx')
				.on('pets_treatments')
				.columns(['pet_id', 'given_on'])
				.execute();
		},
	},
};

export const tables = (db: DbExecutor) => db.withTables<PetsTables>();

export function toPet(row: PetRow): Pet {
	return {
		id: row.id,
		name: row.name,
		species: row.species,
		breed: row.breed,
		sex: row.sex,
		birthDate: row.birth_date,
		chipNumber: row.chip_number,
		vet: row.vet,
		memberIds: JSON.parse(row.member_ids) as string[],
		notes: row.notes,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

export function toTreatment(row: TreatmentRow): PetTreatment {
	return {
		id: row.id,
		petId: row.pet_id,
		kind: row.kind,
		givenOn: row.given_on,
		product: row.product,
		batch: row.batch,
		vet: row.vet,
		notes: row.notes,
		documentId: row.document_id,
		createdBy: row.created_by,
		createdAt: row.created_at,
	};
}
