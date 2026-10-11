import { describe, expect, it } from 'vitest';
import { qrPath } from './qr.js';

describe('qrPath', () => {
	it('draws the code inside a four-module quiet zone', () => {
		const { path, side } = qrPath('https://family.example/display');
		// Version 3 at level M: 29 modules, plus four on each side.
		expect(side).toBe(37);
		const cells = [...path.matchAll(/M(\d+),(\d+)h1v1h-1z/g)].map((m) => ({
			x: Number(m[1]),
			y: Number(m[2]),
		}));
		expect(cells.length).toBeGreaterThan(100);
		const inside = ({ x, y }: { x: number; y: number }) =>
			x >= 4 && y >= 4 && x < side - 4 && y < side - 4;
		expect(cells.every(inside)).toBe(true);
		// The finder pattern's corner is dark.
		expect(path.startsWith('M4,4h1v1h-1z')).toBe(true);
	});
});
