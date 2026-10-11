import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

/**
 * Credentials at rest (provider API keys; other purposes get their own derived key): AES-256-GCM with a key derived from FAMOS_SECRET (HKDF), so a
 * copied database or backup alone does not reveal them. Format: `v1.<iv>.<tag>.<ciphertext>`.
 */
export interface SecretBox {
	seal(plain: string): string;
	/** The plain text, or null when it was sealed with another secret or is corrupt. */
	open(sealed: string): string | null;
}

export function createSecretBox(secret: string, purpose = 'ai-provider-keys'): SecretBox {
	const key = Buffer.from(hkdfSync('sha256', secret, 'famos', purpose, 32));
	return {
		seal(plain) {
			const iv = randomBytes(12);
			const cipher = createCipheriv('aes-256-gcm', key, iv);
			const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
			return ['v1', iv, cipher.getAuthTag(), data]
				.map((p) => (typeof p === 'string' ? p : p.toString('base64url')))
				.join('.');
		},
		open(sealed) {
			const [version, iv, tag, data] = sealed.split('.');
			if (version !== 'v1' || !iv || !tag || data === undefined) return null;
			try {
				const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
				decipher.setAuthTag(Buffer.from(tag, 'base64url'));
				return Buffer.concat([
					decipher.update(Buffer.from(data, 'base64url')),
					decipher.final(),
				]).toString('utf8');
			} catch {
				return null;
			}
		},
	};
}
