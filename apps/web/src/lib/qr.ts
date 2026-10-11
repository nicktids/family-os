import { encode } from 'uqr';

/** The quiet zone of the QR standard: four empty modules around the code, part of the viewBox. */
const QUIET = 4;

/** A QR code as one SVG path of dark modules and the side of its square viewBox. */
export function qrPath(text: string): { path: string; side: number } {
	const { data, size } = encode(text, { border: 0, ecc: 'M' });
	let path = '';
	for (let y = 0; y < size; y++)
		for (let x = 0; x < size; x++) if (data[y]?.[x]) path += `M${x + QUIET},${y + QUIET}h1v1h-1z`;
	return { path, side: size + 2 * QUIET };
}
