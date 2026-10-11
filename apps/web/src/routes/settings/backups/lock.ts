/** How copies are locked (encrypted) before they leave this server. */
export type LockMode = 'passphrase' | 'recipient' | 'none';
export const LOCK_MODES: readonly LockMode[] = ['passphrase', 'recipient', 'none'];

/** The shortest passphrase the server accepts. */
export const MIN_PASSPHRASE = 12;

export interface LockFields {
	passphrase: string;
	again: string;
	/** "I have written the passphrase down" is ticked. */
	written: boolean;
	recipient: string;
}

/** Whether the second step may be saved: a long enough passphrase typed twice and written down,
 * or something that looks like an age public key, or no lock at all (confirmed in a dialog). */
export function lockReady(mode: LockMode, f: LockFields): boolean {
	if (mode === 'passphrase')
		return f.passphrase.length >= MIN_PASSPHRASE && f.passphrase === f.again && f.written;
	if (mode === 'recipient') return f.recipient.trim().startsWith('age1');
	return true;
}

/** The two passphrases differ, said only once something was typed in the second field. */
export const lockMismatch = (f: LockFields): boolean =>
	f.again.length > 0 && f.passphrase !== f.again;
