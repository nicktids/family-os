import { mkdir, readdir, readFile, rename, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { type MailboxConnect, MailboxError, type MailboxSession } from './mailbox.ts';

/**
 * A directory standing in for an IMAP server, for tests only (`FAMOS_EMAIL_FAKE_DIR`).
 *
 * - `<dir>/<mailbox>/<uid>.eml` are the unread messages (the file name is the UID).
 * - Moving a message renames it into `<dir>/<folder>/` under a new number.
 * - Password `wrong-password` is refused and host `unreachable.invalid` cannot be reached, so
 *   the error paths can be exercised.
 */
export function createDirMailbox(dir: string): MailboxConnect {
	return async (credentials) => {
		if (credentials.password === 'wrong-password') throw new MailboxError('auth_failed');
		if (credentials.host === 'unreachable.invalid') throw new MailboxError('unreachable');
		let mailbox = 'INBOX';
		const path = (folder: string, file = '') => {
			if (folder.includes('/') || folder.includes('..')) throw new MailboxError('error');
			return join(dir, folder, file);
		};
		const session: MailboxSession = {
			async select(name) {
				try {
					await stat(path(name));
				} catch {
					if (name === 'INBOX') await mkdir(path(name), { recursive: true });
					else throw new MailboxError('mailbox_missing');
				}
				mailbox = name;
				return { uidValidity: 1 };
			},
			async ensureFolder(folder) {
				await mkdir(path(folder), { recursive: true });
			},
			async unseenUids() {
				const names = await readdir(path(mailbox));
				return names
					.map((n) => /^(\d+)\.eml$/.exec(n)?.[1])
					.filter((n): n is string => n !== undefined)
					.map(Number)
					.sort((a, b) => a - b);
			},
			async fetchSource(uid, maxBytes) {
				const file = path(mailbox, `${uid}.eml`);
				if ((await stat(file)).size > maxBytes) throw new MailboxError('too_big');
				return new Uint8Array(await readFile(file));
			},
			async move(uid, folder) {
				const target = await readdir(path(folder));
				const next = Math.max(0, ...target.map((n) => Number.parseInt(n, 10) || 0)) + 1;
				await rename(path(mailbox, `${uid}.eml`), path(folder, `${next}.eml`));
			},
			async close() {},
		};
		return session;
	};
}
