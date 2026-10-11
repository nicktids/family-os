import type { Migrations } from '@famos/sdk';
import { sql } from 'kysely';

/**
 * better-auth's tables, generated with `scripts/print-auth-schema.ts` (better-auth 1.7.7) and
 * committed as a forward-only migration. On every better-auth upgrade, re-run the script and add
 * a new migration for any differences. Never let better-auth migrate at runtime.
 */
const statements = [
	`create table "auth_users" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" integer not null, "image" text, "createdAt" date not null, "updatedAt" date not null, "memberId" text not null unique)`,
	`create table "auth_sessions" ("id" text not null primary key, "expiresAt" date not null, "token" text not null unique, "createdAt" date not null, "updatedAt" date not null, "ipAddress" text, "userAgent" text, "userId" text not null references "auth_users" ("id") on delete cascade, "deviceId" text)`,
	`create table "auth_accounts" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "auth_users" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" date, "refreshTokenExpiresAt" date, "scope" text, "password" text, "createdAt" date not null, "updatedAt" date not null)`,
	`create table "auth_verifications" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" date not null, "createdAt" date not null, "updatedAt" date not null)`,
	`create index "auth_sessions_userId_idx" on "auth_sessions" ("userId")`,
	`create index "auth_accounts_userId_idx" on "auth_accounts" ("userId")`,
	`create index "auth_verifications_identifier_idx" on "auth_verifications" ("identifier")`,
	// Ours, not better-auth's: PIN sessions remember their trusted device, so revoking the device
	// ends them.
	`create index "auth_sessions_deviceId_idx" on "auth_sessions" ("deviceId")`,
];

export const identityMigrations: Migrations = {
	'0001_init': {
		async up(db) {
			for (const statement of statements) await sql.raw(statement).execute(db);
		},
	},
};
