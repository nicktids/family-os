/**
 * The type of an attachment from its first bytes. What the sender declared is not trusted: a
 * file is accepted only when its content looks like one of the types the Inbox takes (PDF,
 * images, audio, plain text), and it is stored with the sniffed type.
 */
const ascii = (b: Uint8Array, at: number, text: string) =>
	[...text].every((ch, i) => b[at + i] === ch.charCodeAt(0));

export function sniffType(b: Uint8Array): string | null {
	if (b.length < 4) return null;
	if (ascii(b, 0, '%PDF-')) return 'application/pdf';
	if (b[0] === 0x89 && ascii(b, 1, 'PNG\r\n')) return 'image/png';
	if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
	if (ascii(b, 0, 'GIF87a') || ascii(b, 0, 'GIF89a')) return 'image/gif';
	if (ascii(b, 0, 'RIFF') && b.length >= 12) {
		if (ascii(b, 8, 'WEBP')) return 'image/webp';
		if (ascii(b, 8, 'WAVE')) return 'audio/wav';
		return null;
	}
	if (ascii(b, 4, 'ftyp') && b.length >= 12) {
		const brand = String.fromCharCode(b[8] ?? 0, b[9] ?? 0, b[10] ?? 0, b[11] ?? 0);
		if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)) return 'image/heic';
		if (['M4A ', 'M4B ', 'mp42', 'isom', 'MSNV', 'M4P '].includes(brand)) return 'audio/mp4';
		return null;
	}
	if (ascii(b, 0, 'OggS')) return 'audio/ogg';
	if (ascii(b, 0, 'fLaC')) return 'audio/flac';
	if (ascii(b, 0, 'ID3')) return 'audio/mpeg';
	// MPEG audio frame sync (MP3), or ADTS (AAC).
	if (b[0] === 0xff && ((b[1] ?? 0) & 0xf6) === 0xf0) return 'audio/aac';
	if (b[0] === 0xff && ((b[1] ?? 0) & 0xe0) === 0xe0) return 'audio/mpeg';
	if (isPlainText(b)) return 'text/plain';
	return null;
}

/** Valid UTF-8 without NUL or other control bytes (apart from tab, line breaks, form feed). */
function isPlainText(b: Uint8Array): boolean {
	const sample = b.subarray(0, 64 * 1024);
	for (const byte of sample)
		if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13 && byte !== 12) return false;
	try {
		new TextDecoder('utf-8', { fatal: true }).decode(b);
		return true;
	} catch {
		return false;
	}
}
