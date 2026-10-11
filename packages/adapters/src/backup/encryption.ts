import { createReadStream, createWriteStream } from 'node:fs';
import { Readable, Writable } from 'node:stream';
import { Decrypter, Encrypter } from 'age-encryption';

/** How backups leave the server. `none` only after the admin turned encryption off. */
export type Encryption =
	| { mode: 'passphrase'; passphrase: string }
	| { mode: 'recipient'; recipient: string }
	| { mode: 'none' };

/** The name a local `….tar` backup gets on a target. */
export const remoteName = (localName: string, encryption: Encryption) =>
	encryption.mode === 'none' ? localName : `${localName}.age`;

function encrypter(encryption: Exclude<Encryption, { mode: 'none' }>, scryptWorkFactor?: number) {
	const e = new Encrypter();
	if (encryption.mode === 'passphrase') {
		e.setPassphrase(encryption.passphrase);
		if (scryptWorkFactor !== undefined) e.setScryptWorkFactor(scryptWorkFactor);
	} else e.addRecipient(encryption.recipient);
	return e;
}

/**
 * Encrypts a stream of `plainSize` bytes into an age file. The exact output size is known up front
 * (age's format is fixed-overhead), so targets can send a `Content-Length` without buffering.
 */
export async function encryptStream(
	source: ReadableStream<Uint8Array>,
	plainSize: number,
	encryption: Exclude<Encryption, { mode: 'none' }>,
	scryptWorkFactor?: number,
): Promise<{ stream: ReadableStream<Uint8Array>; size: number }> {
	const stream = await encrypter(encryption, scryptWorkFactor).encrypt(source);
	return { stream, size: stream.size(plainSize) };
}

/** Whether `value` is an age public key this library can encrypt to. */
export async function isRecipient(value: string): Promise<boolean> {
	try {
		await encrypter({ mode: 'recipient', recipient: value }).encrypt('probe');
		return true;
	} catch {
		return false;
	}
}

export class DecryptError extends Error {
	constructor() {
		super('Cannot decrypt: wrong passphrase or key, or not an age file');
		this.name = 'DecryptError';
	}
}

/** Decrypts an age file to `output`, streaming. Needs a passphrase or an `AGE-SECRET-KEY-…` identity. */
export async function decryptFile(options: {
	input: string;
	output: string;
	passphrase?: string;
	identity?: string;
}): Promise<void> {
	const decrypter = new Decrypter();
	if (options.passphrase) decrypter.addPassphrase(options.passphrase);
	if (options.identity) decrypter.addIdentity(options.identity.trim());
	const source = Readable.toWeb(createReadStream(options.input)) as ReadableStream<Uint8Array>;
	let plain: ReadableStream<Uint8Array>;
	try {
		plain = await decrypter.decrypt(source);
	} catch {
		throw new DecryptError();
	}
	try {
		await plain.pipeTo(Writable.toWeb(createWriteStream(options.output)));
	} catch {
		// Authentication of a later chunk failed: the file is damaged or truncated.
		throw new Error('The encrypted backup is damaged or incomplete');
	}
}

/** The first `AGE-SECRET-KEY-…` line of an identity file (the `age-keygen` format). */
export function parseIdentityFile(text: string): string {
	const line = text
		.split(/\r?\n/)
		.map((l) => l.trim())
		.find((l) => l.startsWith('AGE-SECRET-KEY-'));
	if (!line) throw new Error('No age identity (AGE-SECRET-KEY-…) found in the file');
	return line;
}
