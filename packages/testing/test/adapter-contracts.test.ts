import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFsFileStore } from '@famos/adapters/files-fs';
import { createSqliteQueue, queueMigrations } from '@famos/adapters/queue-sqlite';
import { uuidv7Ids } from '@famos/adapters/runtime';
import { openDatabase, runMigrations } from '@famos/db';
import { embeddingContract, fileStoreContract, jobQueueContract } from '../src/contracts/index.ts';
import { createFakeLlm, createTestClock } from '../src/index.ts';

jobQueueContract('queue-sqlite', async () => {
	const handle = openDatabase({ path: ':memory:' });
	await runMigrations(handle.db, [{ scope: 'queue', migrations: queueMigrations }]);
	const clock = createTestClock();
	return {
		queue: createSqliteQueue({ db: handle.db, clock, ids: uuidv7Ids }),
		db: handle.db,
		advance: (ms) => clock.advance(ms),
		close: () => handle.close(),
	};
});

fileStoreContract('files-fs', async () =>
	createFsFileStore(await mkdtemp(join(tmpdir(), 'famos-fs-'))),
);

embeddingContract('fake model', async () => {
	const llm = createFakeLlm();
	llm.embedModel = 'fake:embedder';
	const closed = new Set<string>();
	llm.areaAccess = (area) => (closed.has(area) ? 'off' : 'any');
	return {
		llm,
		unset: async () => {
			llm.embedModel = null;
		},
		closeArea: async (area) => {
			closed.add(area);
		},
	};
});
