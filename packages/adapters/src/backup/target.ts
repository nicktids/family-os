/**
 * Where backups go. Implementations talk to one remote store with the credentials the
 * admin entered; they never log URLs, headers or bodies.
 */
export interface RemoteFile {
	name: string;
	size: number | null;
	/** Epoch ms, when the store tells. */
	modifiedAt: number | null;
}

export interface BackupTarget {
	/** Writes (or overwrites) `name`. `size` is the exact byte count when known. */
	put(name: string, body: ReadableStream<Uint8Array>, size?: number): Promise<void>;
	/** Our backup files only (see `isBackupFile`), in no particular order. */
	list(): Promise<RemoteFile[]>;
	delete(name: string): Promise<void>;
	/** Writes and deletes a tiny probe file; throws a `BackupTargetError` when anything fails. */
	test(): Promise<void>;
}

/** What the settings page can show without leaking anything: a short code, never a message. */
export class BackupTargetError extends Error {
	readonly code: string;
	/** Whether trying again later can help (network, server errors) or not (bad credentials). */
	readonly retryable: boolean;

	constructor(code: string, retryable: boolean) {
		super(code);
		this.name = 'BackupTargetError';
		this.code = code;
		this.retryable = retryable;
	}
}

/** `famos-<timestamp>-<reason>.tar`, optionally encrypted (`.tar.age`). */
const BACKUP_FILE = /^famos-[A-Za-z0-9-]+\.tar(\.age)?$/;
export const isBackupFile = (name: string) => BACKUP_FILE.test(name);

/** Names to delete so that the `keep` newest remain. Backups are named by time. */
export function expired(files: readonly RemoteFile[], keep: number): string[] {
	return files
		.map((f) => f.name)
		.filter(isBackupFile)
		.sort()
		.reverse()
		.slice(keep);
}

export const UPLOAD_TIMEOUT_MS = 45 * 60 * 1000;
export const CONTROL_TIMEOUT_MS = 30 * 1000;

/** Turns a failed `fetch` into a code. */
export function networkError(error: unknown): BackupTargetError {
	if (error instanceof BackupTargetError) return error;
	const name = error instanceof Error ? error.name : '';
	if (name === 'TimeoutError' || name === 'AbortError')
		return new BackupTargetError('timeout', true);
	return new BackupTargetError('unreachable', true);
}

export function httpError(status: number): BackupTargetError {
	// 408, 425, 429 and server errors may pass; other client errors are configuration problems.
	const retryable = status >= 500 || status === 408 || status === 425 || status === 429;
	return new BackupTargetError(`http_${status}`, retryable);
}

/** Reads a stream into chunks of exactly `size` bytes (the last one may be shorter). */
export async function* chunked(
	stream: ReadableStream<Uint8Array>,
	size: number,
): AsyncGenerator<Buffer> {
	const reader = stream.getReader();
	let pending: Buffer[] = [];
	let length = 0;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			pending.push(Buffer.from(value.buffer, value.byteOffset, value.byteLength));
			length += value.byteLength;
			if (length >= size) {
				let all = Buffer.concat(pending);
				while (all.length >= size) {
					yield all.subarray(0, size);
					all = all.subarray(size);
				}
				pending = all.length > 0 ? [all] : [];
				length = all.length;
			}
		}
		if (length > 0) yield Buffer.concat(pending);
	} finally {
		reader.releaseLock();
	}
}
