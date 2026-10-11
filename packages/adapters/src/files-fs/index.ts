import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { FileStat, FileStore } from '@famos/sdk';

/**
 * FileStore on the local filesystem under `root` (the `files/` directory that backups include).
 * Content type is kept in a small sidecar file. Writes go to a temp file and are renamed into
 * place, so readers never see partial files.
 */
export function createFsFileStore(root: string): FileStore {
	const base = resolve(root);

	const pathFor = (key: string) => {
		if (
			!/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(key) ||
			key.includes('..') ||
			key.endsWith('.meta.json')
		) {
			throw new Error(`Invalid file key "${key}"`);
		}
		const full = resolve(base, key);
		if (!full.startsWith(base + sep)) throw new Error(`File key escapes root: ${key}`);
		return full;
	};
	const metaFor = (path: string) => `${path}.meta.json`;

	async function readStat(path: string): Promise<FileStat | null> {
		try {
			const s = await stat(path);
			const meta = await readFile(metaFor(path), 'utf8').then(
				(raw) => JSON.parse(raw) as { contentType?: string },
				() => ({}) as { contentType?: string },
			);
			return { size: s.size, contentType: meta.contentType };
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
			throw error;
		}
	}

	return {
		async put(key, data, contentType) {
			const path = pathFor(key);
			await mkdir(dirname(path), { recursive: true });
			const temp = join(
				dirname(path),
				`.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
			);
			try {
				if (data instanceof Uint8Array) await writeFile(temp, data);
				else await pipeline(Readable.from(data), createWriteStream(temp));
				await writeFile(metaFor(path), JSON.stringify({ contentType }));
				await rename(temp, path);
			} catch (error) {
				await rm(temp, { force: true });
				throw error;
			}
			const result = await readStat(path);
			if (!result) throw new Error(`File vanished after write: ${key}`);
			return result;
		},
		async get(key) {
			const path = pathFor(key);
			const s = await readStat(path);
			if (!s) return null;
			return { stream: createReadStream(path), stat: s };
		},
		stat: (key) => readStat(pathFor(key)),
		async delete(key) {
			const path = pathFor(key);
			await rm(path, { force: true });
			await rm(metaFor(path), { force: true });
		},
	};
}
