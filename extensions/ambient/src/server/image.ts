export type ImageType = 'image/jpeg' | 'image/png' | 'image/webp';

export interface ImageInfo {
	type: ImageType;
	width: number;
	height: number;
}

const u16be = (b: Uint8Array, i: number) => ((b[i] ?? 0) << 8) | (b[i + 1] ?? 0);
const u32be = (b: Uint8Array, i: number) => u16be(b, i) * 65536 + u16be(b, i + 2);
const u16le = (b: Uint8Array, i: number) => (b[i] ?? 0) | ((b[i + 1] ?? 0) << 8);
const u24le = (b: Uint8Array, i: number) => u16le(b, i) | ((b[i + 2] ?? 0) << 16);
const u32le = (b: Uint8Array, i: number) => u16le(b, i) + u16le(b, i + 2) * 65536;
const text = (b: Uint8Array, from: number, to: number) =>
	String.fromCharCode(...b.subarray(from, to));

function pngSize(b: Uint8Array) {
	if (text(b, 12, 16) !== 'IHDR') return null;
	return { width: u32be(b, 16), height: u32be(b, 20) };
}

function jpegSize(b: Uint8Array) {
	let i = 2;
	while (i + 9 < b.length) {
		if (b[i] !== 0xff) return null;
		const marker = b[i + 1] ?? 0;
		if (marker === 0xff) {
			i++;
			continue;
		}
		// Start-of-frame markers carry the size (not DHT 0xc4, JPG 0xc8 or DAC 0xcc).
		if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
			return { height: u16be(b, i + 5), width: u16be(b, i + 7) };
		if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
			i += 2;
			continue;
		}
		i += 2 + u16be(b, i + 2);
	}
	return null;
}

function webpSize(b: Uint8Array) {
	const chunk = text(b, 12, 16);
	if (chunk === 'VP8 ' && b.length >= 30)
		return { width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff };
	if (chunk === 'VP8L' && b.length >= 25 && b[20] === 0x2f) {
		const bits = u32le(b, 21);
		return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
	}
	if (chunk === 'VP8X' && b.length >= 30)
		return { width: u24le(b, 24) + 1, height: u24le(b, 27) + 1 };
	return null;
}

/**
 * The image type and size from the first bytes (the client's claim is not trusted); null when
 * the bytes are not a JPEG, PNG or WebP image with a readable size.
 */
export function inspectImage(bytes: Uint8Array): ImageInfo | null {
	let type: ImageType;
	let size: { width: number; height: number } | null;
	if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
		type = 'image/jpeg';
		size = jpegSize(bytes);
	} else if (
		bytes.length >= 24 &&
		text(bytes, 1, 4) === 'PNG' &&
		bytes[0] === 0x89 &&
		bytes[4] === 0x0d &&
		bytes[5] === 0x0a
	) {
		type = 'image/png';
		size = pngSize(bytes);
	} else if (bytes.length >= 16 && text(bytes, 0, 4) === 'RIFF' && text(bytes, 8, 12) === 'WEBP') {
		type = 'image/webp';
		size = webpSize(bytes);
	} else return null;
	if (!size || size.width < 1 || size.height < 1) return null;
	return { type, ...size };
}
