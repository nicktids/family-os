import { describe, expect, it } from 'vitest';
import { accepts, addFiles, dragHasFiles, wayStatus } from '../src/web/ways.ts';

const ACCEPT = ['image/*', 'audio/*', 'application/pdf', 'text/plain'];
const file = (name: string, type: string) => new File(['x'], name, { type });

describe('wayStatus', () => {
	it('says nothing while it is not known', () => {
		expect(wayStatus(null, true)).toBe('unknown');
		expect(wayStatus(undefined, false)).toBe('unknown');
	});
	it('offers to set it up only to someone who may', () => {
		expect(wayStatus(false, true)).toBe('setup');
		expect(wayStatus(false, false)).toBe('waiting');
	});
	it('asks a person to link their own account when the family has it', () => {
		expect(wayStatus(true, false, false)).toBe('link');
		expect(wayStatus(true, false, true)).toBe('ready');
		expect(wayStatus(true, true)).toBe('ready');
	});
});

describe('files dropped or pasted', () => {
	it('matches kinds like a file input', () => {
		expect(accepts('image/png', ACCEPT)).toBe(true);
		expect(accepts('IMAGE/JPEG', ACCEPT)).toBe(true);
		expect(accepts('application/pdf', ACCEPT)).toBe(true);
		expect(accepts('application/zip', ACCEPT)).toBe(false);
		expect(accepts('', ACCEPT)).toBe(false);
	});
	it('keeps kinds the box takes, up to the limit, and counts the rest', () => {
		const current = [file('a.png', 'image/png')];
		const { files, refused } = addFiles(
			current,
			[
				file('b.pdf', 'application/pdf'),
				file('c.zip', 'application/zip'),
				file('d.jpg', 'image/jpeg'),
			],
			ACCEPT,
			2,
		);
		expect(files.map((f) => f.name)).toEqual(['a.png', 'b.pdf']);
		expect(refused).toBe(2);
		expect(current).toHaveLength(1);
	});
	it('only reacts to drags that carry files', () => {
		expect(dragHasFiles(['Files'])).toBe(true);
		expect(dragHasFiles(['text/plain'])).toBe(false);
		expect(dragHasFiles(undefined)).toBe(false);
	});
});
