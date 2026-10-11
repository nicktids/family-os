/**
 * RFC 9562 UUIDv7: 48-bit Unix ms timestamp, version 7, a 12-bit counter in rand_a, variant 10,
 * 62 random bits. Ids are strictly increasing within one generator: in the same millisecond (or
 * when the clock steps back) the counter is incremented, and when it overflows the timestamp is
 * advanced by one millisecond.
 */
export function createUuidv7(now: () => number = Date.now): () => string {
	let lastMs = 0;
	let counter = 0;
	const seed = () => (crypto.getRandomValues(new Uint16Array(1))[0] ?? 0) & 0x7ff; // leaves room to count up

	return () => {
		const ms = now();
		if (ms > lastMs) {
			lastMs = ms;
			counter = seed();
		} else if (++counter > 0xfff) {
			lastMs += 1;
			counter = seed();
		}
		const b = crypto.getRandomValues(new Uint8Array(16));
		b[0] = Math.floor(lastMs / 2 ** 40) & 0xff;
		b[1] = Math.floor(lastMs / 2 ** 32) & 0xff;
		b[2] = (lastMs >>> 24) & 0xff;
		b[3] = (lastMs >>> 16) & 0xff;
		b[4] = (lastMs >>> 8) & 0xff;
		b[5] = lastMs & 0xff;
		b[6] = 0x70 | (counter >>> 8);
		b[7] = counter & 0xff;
		b[8] = 0x80 | ((b[8] ?? 0) & 0x3f);
		const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
		return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
	};
}
