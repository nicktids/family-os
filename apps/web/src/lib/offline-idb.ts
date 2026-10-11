import {
	createMemoryStore,
	type FailedChange,
	type QueuedChange,
	type QueueStore,
} from './offline-queue.js';

/** A tiny promise wrapper over IndexedDB for the offline queue (no dependency). */
const DB_NAME = 'famos-offline';
const QUEUE = 'queue';
const FAILED = 'failed';

function open(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, 1);
		request.onupgradeneeded = () => {
			const db = request.result;
			db.createObjectStore(QUEUE, { keyPath: 'key' });
			db.createObjectStore(FAILED, { keyPath: 'key' });
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

export function createIndexedDbStore(): QueueStore {
	let db: Promise<IDBDatabase> | null = null;
	const connection = () => (db ??= open());

	async function run<T>(
		store: string,
		mode: IDBTransactionMode,
		work: (s: IDBObjectStore) => IDBRequest<T>,
	): Promise<T> {
		const database = await connection();
		return new Promise<T>((resolve, reject) => {
			const tx = database.transaction(store, mode);
			const request = work(tx.objectStore(store));
			tx.oncomplete = () => resolve(request.result);
			tx.onerror = () => reject(tx.error);
			tx.onabort = () => reject(tx.error);
		});
	}

	return {
		list: () => run<QueuedChange[]>(QUEUE, 'readonly', (s) => s.getAll()),
		put: async (change) => void (await run(QUEUE, 'readwrite', (s) => s.put(change))),
		remove: async (key) => void (await run(QUEUE, 'readwrite', (s) => s.delete(key))),
		listFailed: () => run<FailedChange[]>(FAILED, 'readonly', (s) => s.getAll()),
		putFailed: async (failed) => void (await run(FAILED, 'readwrite', (s) => s.put(failed))),
		removeFailed: async (key) => void (await run(FAILED, 'readwrite', (s) => s.delete(key))),
		async clear() {
			await run(QUEUE, 'readwrite', (s) => s.clear());
			await run(FAILED, 'readwrite', (s) => s.clear());
		},
	};
}

/** IndexedDB when the browser allows it (not in some private windows), else memory. */
export function createBrowserStore(): QueueStore {
	if (typeof indexedDB === 'undefined') return createMemoryStore();
	const persistent = createIndexedDbStore();
	const fallback = createMemoryStore();
	let broken = false;
	// Every call tries IndexedDB first and falls back to memory for the rest of the session.
	const guard =
		<A extends unknown[], R>(pick: (s: QueueStore) => (...a: A) => Promise<R>) =>
		async (...args: A): Promise<R> => {
			if (!broken) {
				try {
					return await pick(persistent)(...args);
				} catch {
					broken = true;
				}
			}
			return pick(fallback)(...args);
		};
	return {
		list: guard((s) => () => s.list()),
		put: guard((s) => (c: QueuedChange) => s.put(c)),
		remove: guard((s) => (k: string) => s.remove(k)),
		listFailed: guard((s) => () => s.listFailed()),
		putFailed: guard((s) => (f: FailedChange) => s.putFailed(f)),
		removeFailed: guard((s) => (k: string) => s.removeFailed(k)),
		clear: guard((s) => () => s.clear()),
	};
}
