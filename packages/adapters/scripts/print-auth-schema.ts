// Prints the SQL better-auth would run on an empty SQLite database. Used once per better-auth
// upgrade to write a new forward-only migration in src/identity-betterauth/migrations.ts.
import { openDatabase } from '@famos/db';
import { getMigrations } from 'better-auth/db/migration';
import { authOptions } from '../src/identity-betterauth/index.ts';

const { db } = openDatabase({ path: ':memory:' });
const options = authOptions({
	db,
	secret: 'x'.repeat(32),
	baseURL: 'http://localhost',
	trustedDevice: async () => null,
	mayUsePin: async () => false,
});
const { compileMigrations } = await getMigrations(options);
console.log(await compileMigrations());
