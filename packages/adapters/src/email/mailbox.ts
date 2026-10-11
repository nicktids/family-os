import { ImapFlow } from 'imapflow';

/** Why talking to the mailbox failed; shown to the admin as a code, never with server text. */
export type MailboxErrorCode =
	| 'auth_failed'
	| 'unreachable'
	| 'tls_failed'
	| 'mailbox_missing'
	| 'folder_failed'
	| 'too_big'
	| 'error';

export class MailboxError extends Error {
	readonly code: MailboxErrorCode;
	constructor(code: MailboxErrorCode) {
		super(code);
		this.name = 'MailboxError';
		this.code = code;
	}
}

export interface MailboxCredentials {
	host: string;
	port: number;
	username: string;
	password: string;
}

/**
 * The few IMAP operations the adapter needs. The poller only sees this, so tests (and the
 * end-to-end run) can stand in a directory of `.eml` files for a server.
 */
export interface MailboxSession {
	/** Opens the mailbox; returns its UIDVALIDITY. */
	select(mailbox: string): Promise<{ uidValidity: number }>;
	/** Creates the folder when it does not exist. */
	ensureFolder(folder: string): Promise<void>;
	/** UIDs of unread messages in the selected mailbox, oldest first. */
	unseenUids(): Promise<number[]>;
	/** The raw message, without marking it read. Throws `too_big` above `maxBytes`. */
	fetchSource(uid: number, maxBytes: number): Promise<Uint8Array>;
	/** Moves the message to the folder (it keeps its content, gets a new UID there). */
	move(uid: number, folder: string): Promise<void>;
	close(): Promise<void>;
}

export type MailboxConnect = (credentials: MailboxCredentials) => Promise<MailboxSession>;

const TLS_CODES =
	/^(?:ERR_SSL|ERR_TLS|CERT_|DEPTH_ZERO|UNABLE_TO_|SELF_SIGNED|HOSTNAME_MISMATCH|ERR_OSSL)/;
const NETWORK_CODES = new Set([
	'ECONNREFUSED',
	'ECONNRESET',
	'ENOTFOUND',
	'ETIMEDOUT',
	'EHOSTUNREACH',
	'ENETUNREACH',
	'EAI_AGAIN',
	'NoConnection',
	'ETIMEOUT',
]);

/** Maps what imapflow throws to a code that is safe to store and show. */
export function mailboxErrorOf(error: unknown): MailboxError {
	if (error instanceof MailboxError) return error;
	const e = error as { code?: string; authenticationFailed?: boolean; serverResponseCode?: string };
	if (e?.authenticationFailed) return new MailboxError('auth_failed');
	if (e?.code && TLS_CODES.test(e.code)) return new MailboxError('tls_failed');
	if (e?.code && NETWORK_CODES.has(e.code)) return new MailboxError('unreachable');
	if (e?.serverResponseCode === 'NONEXISTENT') return new MailboxError('mailbox_missing');
	return new MailboxError('error');
}

const SECOND = 1000;

/**
 * The real mailbox: imapflow over TLS. Port 143 upgrades with STARTTLS and refuses to go on
 * without it; every other port is TLS from the first byte. Certificates are always verified.
 * imapflow logging is off: its debug lines would contain addresses and subjects.
 */
export const connectImap: MailboxConnect = async (credentials) => {
	const client = new ImapFlow({
		host: credentials.host,
		port: credentials.port,
		secure: credentials.port !== 143,
		doSTARTTLS: credentials.port === 143 ? true : undefined,
		auth: { user: credentials.username, pass: credentials.password },
		logger: false,
		connectionTimeout: 15 * SECOND,
		greetingTimeout: 15 * SECOND,
		socketTimeout: 90 * SECOND,
		disableAutoIdle: true,
		tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
	});
	// An unhandled 'error' event would crash the process; the failing call reports it instead.
	client.on('error', () => {});
	try {
		await client.connect();
	} catch (error) {
		client.close();
		throw mailboxErrorOf(error);
	}

	const wrap = async <T>(run: () => Promise<T>): Promise<T> => {
		try {
			return await run();
		} catch (error) {
			throw mailboxErrorOf(error);
		}
	};

	return {
		select: (mailbox) =>
			wrap(async () => {
				try {
					const opened = await client.mailboxOpen(mailbox);
					return { uidValidity: Number(opened.uidValidity) };
				} catch (error) {
					throw new MailboxError(
						(error as { mailboxMissing?: boolean })?.mailboxMissing ||
							(error as { serverResponseCode?: string })?.serverResponseCode === 'NONEXISTENT'
							? 'mailbox_missing'
							: mailboxErrorOf(error).code,
					);
				}
			}),

		ensureFolder: async (folder) => {
			try {
				const existing = await client.list();
				if (existing.some((f) => f.path === folder)) return;
				await client.mailboxCreate(folder);
			} catch (error) {
				if ((error as { serverResponseCode?: string })?.serverResponseCode === 'ALREADYEXISTS')
					return;
				throw new MailboxError('folder_failed');
			}
		},

		unseenUids: () =>
			wrap(async () => {
				const found = await client.search({ seen: false }, { uid: true });
				return Array.isArray(found) ? [...found].sort((a, b) => a - b) : [];
			}),

		fetchSource: (uid, maxBytes) =>
			wrap(async () => {
				const head = await client.fetchOne(String(uid), { size: true }, { uid: true });
				if (!head) throw new MailboxError('error');
				if ((head.size ?? 0) > maxBytes) throw new MailboxError('too_big');
				// `source` is fetched with BODY.PEEK: the message stays unread.
				const full = await client.fetchOne(
					String(uid),
					{ source: { maxLength: maxBytes } },
					{ uid: true },
				);
				const source = full ? full.source : undefined;
				if (!source) throw new MailboxError('error');
				return new Uint8Array(source);
			}),

		move: (uid, folder) =>
			wrap(async () => {
				const moved = await client.messageMove(String(uid), folder, { uid: true });
				if (!moved) throw new MailboxError('folder_failed');
			}),

		close: async () => {
			try {
				await client.logout();
			} catch {
				client.close();
			}
		},
	};
};
