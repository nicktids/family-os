import {
	createCipheriv,
	createDecipheriv,
	createECDH,
	createPrivateKey,
	hkdfSync,
	randomBytes,
	sign,
} from 'node:crypto';

/**
 * Web Push cryptography with node:crypto only: VAPID (RFC 8292) and the aes128gcm content
 * encoding for push messages (RFC 8291 + RFC 8188). Public test vector: RFC 8291 Appendix A.
 */

const RECORD_SIZE = 4096;
const b64 = (buf: Uint8Array) => Buffer.from(buf).toString('base64url');

export interface VapidKeys {
	/** Uncompressed P-256 point, base64url (the `applicationServerKey`). */
	publicKey: string;
	/** The 32-byte private scalar, base64url. */
	privateKey: string;
}

export function generateVapidKeys(): VapidKeys {
	const ecdh = createECDH('prime256v1');
	ecdh.generateKeys();
	return { publicKey: b64(ecdh.getPublicKey()), privateKey: b64(ecdh.getPrivateKey()) };
}

export interface EncryptInput {
	plaintext: Uint8Array;
	/** The browser's `p256dh` key (65 bytes, uncompressed) and `auth` secret (16 bytes). */
	uaPublic: Uint8Array;
	authSecret: Uint8Array;
	/** Fixed values for the RFC test vector; random in production. */
	asPrivate?: Uint8Array;
	salt?: Uint8Array;
}

/** A complete `aes128gcm` request body: header, then one encrypted record. */
export function encryptPayload(input: EncryptInput): Buffer {
	const ecdh = createECDH('prime256v1');
	if (input.asPrivate) ecdh.setPrivateKey(Buffer.from(input.asPrivate));
	else ecdh.generateKeys();
	const asPublic = ecdh.getPublicKey();
	const salt = Buffer.from(input.salt ?? randomBytes(16));
	const uaPublic = Buffer.from(input.uaPublic);

	const secret = ecdh.computeSecret(uaPublic);
	const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic]);
	const ikm = Buffer.from(hkdfSync('sha256', secret, Buffer.from(input.authSecret), keyInfo, 32));
	const cek = Buffer.from(
		hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16),
	);
	const nonce = Buffer.from(
		hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12),
	);

	// One record, so the last-record delimiter 0x02 follows the data.
	const cipher = createCipheriv('aes-128-gcm', cek, nonce);
	const encrypted = Buffer.concat([
		cipher.update(Buffer.concat([Buffer.from(input.plaintext), Buffer.from([2])])),
		cipher.final(),
		cipher.getAuthTag(),
	]);
	const header = Buffer.alloc(21);
	salt.copy(header, 0);
	header.writeUInt32BE(RECORD_SIZE, 16);
	header[20] = asPublic.length;
	return Buffer.concat([header, asPublic, encrypted]);
}

/** Test helper: what the browser does with the body. Not used by the server. */
export function decryptPayload(
	body: Uint8Array,
	uaPrivate: Uint8Array,
	uaPublic: Uint8Array,
	authSecret: Uint8Array,
): Buffer {
	const buf = Buffer.from(body);
	const salt = buf.subarray(0, 16);
	const idLen = buf[20] ?? 0;
	const asPublic = buf.subarray(21, 21 + idLen);
	const record = buf.subarray(21 + idLen);
	const ecdh = createECDH('prime256v1');
	ecdh.setPrivateKey(Buffer.from(uaPrivate));
	const secret = ecdh.computeSecret(asPublic);
	const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), Buffer.from(uaPublic), asPublic]);
	const ikm = Buffer.from(hkdfSync('sha256', secret, Buffer.from(authSecret), keyInfo, 32));
	const cek = Buffer.from(
		hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16),
	);
	const nonce = Buffer.from(
		hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12),
	);
	const decipher = createDecipheriv('aes-128-gcm', cek, nonce);
	decipher.setAuthTag(record.subarray(record.length - 16));
	const plain = Buffer.concat([
		decipher.update(record.subarray(0, record.length - 16)),
		decipher.final(),
	]);
	let end = plain.length;
	while (end > 0 && plain[end - 1] === 0) end--;
	return plain.subarray(0, end - 1); // drop the 0x02 delimiter
}

export interface VapidClaims {
	/** The push service origin, e.g. `https://fcm.googleapis.com`. */
	aud: string;
	/** Contact: a `mailto:` or `https:` URL. */
	sub: string;
	/** Seconds since the epoch; at most 24 h ahead (we use 12 h). */
	exp: number;
}

/** The `Authorization` header value: `vapid t=<ES256 JWT>, k=<public key>`. */
export function vapidAuthorization(keys: VapidKeys, claims: VapidClaims): string {
	const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
	const signingInput = `${part({ typ: 'JWT', alg: 'ES256' })}.${part(claims)}`;
	const point = Buffer.from(keys.publicKey, 'base64url');
	const key = createPrivateKey({
		format: 'jwk',
		key: {
			kty: 'EC',
			crv: 'P-256',
			d: keys.privateKey,
			x: b64(point.subarray(1, 33)),
			y: b64(point.subarray(33, 65)),
		},
	});
	// JOSE wants the raw r||s signature, not DER.
	const signature = sign('sha256', Buffer.from(signingInput), {
		key,
		dsaEncoding: 'ieee-p1363',
	});
	return `vapid t=${signingInput}.${b64(signature)}, k=${keys.publicKey}`;
}
