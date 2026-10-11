/**
 * The text color for letters drawn on a member's color. Member colors are data (set in core, or
 * picked by an admin), so no single text color is readable on all of them: this picks the
 * on-color token (white) or the ink token, whichever contrasts more. The palette in core is tuned
 * so that choice reaches 4.5:1 (WCAG AA); for a free pick the best of the two is at least about
 * 4.1:1 (mid-tone colors are the weak spot).
 * Member colors are day colors: draw them inside `.day`.
 */

/** Relative luminance of the day `--ink` token, the dark choice. */
const INK_LUMINANCE = 0.0116;

function channel(byte: number): number {
	const v = byte / 255;
	return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of `#rrggbb`, or null when it is not that form. */
export function hexLuminance(hex: string): number | null {
	const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
	if (!m) return null;
	const [r, g, b] = [m[1], m[2], m[3]].map((h) => channel(Number.parseInt(h as string, 16)));
	return 0.2126 * (r as number) + 0.7152 * (g as number) + 0.0722 * (b as number);
}

/** `var(--on-color)` or `var(--ink)`: the one that reads better on `background`. */
export function onMemberColor(background: string): 'var(--on-color)' | 'var(--ink)' {
	const l = hexLuminance(background);
	if (l === null) return 'var(--on-color)';
	const white = 1.05 / (l + 0.05);
	const ink = (l + 0.05) / (INK_LUMINANCE + 0.05);
	return white >= ink ? 'var(--on-color)' : 'var(--ink)';
}
