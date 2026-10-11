import { describe, expect, it } from 'vitest';
import { type LockFields, lockMismatch, lockReady } from './lock.js';

const empty: LockFields = { passphrase: '', again: '', written: false, recipient: '' };

describe('lockReady', () => {
	it('needs a passphrase of twelve characters, typed twice and written down', () => {
		const good = 'purple elephant sunrise';
		expect(
			lockReady('passphrase', { ...empty, passphrase: good, again: good, written: true }),
		).toBe(true);
		expect(lockReady('passphrase', { ...empty, passphrase: good, again: good })).toBe(false);
		expect(
			lockReady('passphrase', { ...empty, passphrase: good, again: `${good}x`, written: true }),
		).toBe(false);
		expect(
			lockReady('passphrase', { ...empty, passphrase: 'short', again: 'short', written: true }),
		).toBe(false);
	});

	it('takes a public key that starts with age1', () => {
		expect(lockReady('recipient', { ...empty, recipient: '  age1qyqszqgpqyqszqgp ' })).toBe(true);
		expect(lockReady('recipient', { ...empty, recipient: 'ssh-ed25519 AAAA' })).toBe(false);
	});

	it('lets "no lock" through (a dialog asks first)', () => {
		expect(lockReady('none', empty)).toBe(true);
	});
});

describe('lockMismatch', () => {
	it('speaks only once the second field has text', () => {
		expect(lockMismatch({ ...empty, passphrase: 'abc' })).toBe(false);
		expect(lockMismatch({ ...empty, passphrase: 'abc', again: 'ab' })).toBe(true);
		expect(lockMismatch({ ...empty, passphrase: 'abc', again: 'abc' })).toBe(false);
	});
});
