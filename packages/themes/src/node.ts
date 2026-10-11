import { readdirSync, readFileSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { RawThemePack } from './pack.ts';

/**
 * File access for theme packs (server and tools; never the browser). A pack on disk is a folder
 * `<id>/` with `manifest.json`, `tokens.json` and its `.woff2` files; on the wire the fonts are
 * base64 in one JSON document, so a pack is installed with one request.
 */

/** Reads a pack folder. Throws when the folder, its manifest or its tokens are unreadable. */
export function readThemeDirSync(dir: string): RawThemePack {
	const manifest: unknown = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
	const tokens: unknown = JSON.parse(readFileSync(join(dir, 'tokens.json'), 'utf8'));
	const fonts: Record<string, string> = {};
	for (const file of readdirSync(dir)) {
		if (file.endsWith('.woff2')) fonts[file] = readFileSync(join(dir, file)).toString('base64');
	}
	return { manifest, tokens, fonts };
}

/** The pack folders inside a directory; none when it does not exist. */
export function listThemeDirsSync(root: string): string[] {
	try {
		return readdirSync(root, { withFileTypes: true })
			.filter((e) => e.isDirectory())
			.map((e) => e.name);
	} catch {
		return [];
	}
}

/** Writes a validated pack folder, replacing what was there. */
export async function writeThemeDir(
	dir: string,
	pack: { manifest: unknown; tokens: unknown; fonts: Record<string, Uint8Array> },
): Promise<void> {
	await rm(dir, { recursive: true, force: true });
	await mkdir(dir, { recursive: true });
	await writeFile(join(dir, 'manifest.json'), `${JSON.stringify(pack.manifest, null, '\t')}\n`);
	await writeFile(join(dir, 'tokens.json'), `${JSON.stringify(pack.tokens, null, '\t')}\n`);
	for (const [name, bytes] of Object.entries(pack.fonts)) {
		// Names come from validated packs (plain `.woff2` names), never from a path a client chose.
		if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.woff2$/.test(name))
			throw new Error(`Invalid font "${name}"`);
		await writeFile(join(dir, name), bytes);
	}
}
