import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STYLE_IDS, type StyleId, type ThemePort, type ThemeSummary } from '@famos/core';
import { FamosError, type Logger } from '@famos/sdk';
import {
	previewOf,
	renderStylesheet,
	type ThemePack,
	type ThemeTokens,
	validateThemePack,
} from '@famos/themes';
import { listThemeDirsSync, readThemeDirSync, writeThemeDir } from '@famos/themes/node';

/** More installed packs than anyone needs; keeps the data directory and the theme list sane. */
const MAX_INSTALLED = 40;
/** The bundled pack every other pack inherits missing tokens from, and the app's default. */
const DEFAULT_ID = 'ev-isigi';

interface Loaded {
	pack: ThemePack;
	source: 'bundled' | 'installed';
	overridesBundled: boolean;
	dir: string;
	css: string;
	/** Changes with the content: the stylesheet's ETag and the web app's cache key. */
	version: string;
}

export interface ThemeRegistryOptions {
	appVersion: string;
	/** Packs shipped with the app. */
	bundledDir: string | undefined;
	/** Packs an admin installed (`<data>/themes`). */
	installedDir: string;
	logger: Logger;
}

/**
 * Where the bundled packs live when `FAMOS_THEMES_DIR` is not set: next to the server bundle in
 * the image (`/app/server/main.mjs` → `/app/themes`), or at the repository root when running
 * from source or from `apps/server/dist`.
 */
export function findBundledThemes(configured: string | undefined): string | undefined {
	if (configured) return configured;
	const here = dirname(fileURLToPath(import.meta.url));
	return [resolve(here, '../themes'), resolve(here, '../../../themes')].find(
		(dir) => existsSync(dir) && listThemeDirsSync(dir).length > 0,
	);
}

const sha = (...parts: (string | Uint8Array)[]) => {
	const hash = createHash('sha256');
	for (const part of parts) hash.update(part);
	return hash.digest('hex').slice(0, 10);
};

/** What a refused pack tells the person: the first few reasons, then how many more. */
function refusal(errors: string[]): FamosError {
	const shown = errors.slice(0, 5).join('; ');
	const more = errors.length > 5 ? ` (and ${errors.length - 5} more)` : '';
	return new FamosError('bad_request', `${shown}${more}`, { problems: errors });
}

/**
 * The theme registry: bundled packs, then installed ones (an installed pack with the
 * same id replaces the bundled one). Everything is validated on the way in; a pack that fails is
 * skipped and logged, never fatal. Packs in the image are checked with contrast shortfalls as
 * warnings (Ev Işığı predates the rule); installed packs must pass.
 */
export function createThemeRegistry(options: ThemeRegistryOptions): ThemePort {
	const { appVersion, logger } = options;
	let loaded = new Map<string, Loaded>();
	/** What a pack that leaves tokens out inherits: the bundled default's. */
	let defaults: ThemeTokens | undefined;

	function load(root: string, folder: string, source: Loaded['source'], into: Map<string, Loaded>) {
		try {
			const dir = join(root, folder);
			const result = validateThemePack(readThemeDirSync(dir), {
				appVersion,
				styles: STYLE_IDS,
				...(defaults && { fallback: defaults }),
			});
			if (!result.ok) throw new Error(result.errors.join('; '));
			const { pack, warnings } = result;
			if (pack.manifest.id !== folder) throw new Error('the folder is not named after the id');
			if (warnings.length > 0) {
				logger.warn({ id: folder, warnings: warnings.length }, 'theme pack has warnings');
			}
			const css = renderStylesheet(
				pack,
				(file) => `/api/v1/core/themes/${pack.manifest.id}/fonts/${encodeURIComponent(file)}`,
			);
			into.set(pack.manifest.id, {
				pack,
				source,
				overridesBundled:
					source === 'installed' && into.get(pack.manifest.id)?.source === 'bundled',
				dir,
				css,
				version: `${pack.manifest.version}-${sha(css, ...Object.values(pack.fonts))}`,
			});
		} catch (error) {
			logger.warn(
				{ id: folder, reason: error instanceof Error ? error.message : 'unreadable' },
				'theme pack skipped',
			);
		}
	}

	function reload() {
		const next = new Map<string, Loaded>();
		defaults = undefined;
		if (options.bundledDir) {
			// The default first: the others inherit what they leave out from it.
			const folders = listThemeDirsSync(options.bundledDir).sort((a, b) =>
				a === DEFAULT_ID ? -1 : b === DEFAULT_ID ? 1 : a.localeCompare(b),
			);
			for (const folder of folders) {
				load(options.bundledDir, folder, 'bundled', next);
				if (folder === DEFAULT_ID) defaults = next.get(DEFAULT_ID)?.pack.tokens;
			}
		}
		for (const folder of listThemeDirsSync(options.installedDir)) {
			load(options.installedDir, folder, 'installed', next);
		}
		loaded = next;
	}
	reload();

	const summary = (entry: Loaded): ThemeSummary => ({
		id: entry.pack.manifest.id,
		name: entry.pack.manifest.name,
		version: entry.version,
		authors: entry.pack.manifest.authors ?? [],
		source: entry.source,
		overridesBundled: entry.overridesBundled,
		preview: previewOf(entry.pack.tokens),
		// Validation dropped an id that is not one of STYLE_IDS.
		style: (entry.pack.manifest.style as StyleId | undefined) ?? null,
	});

	return {
		list: () =>
			[...loaded.values()]
				// The default first, then by name.
				.sort((a, b) =>
					a.pack.manifest.id === DEFAULT_ID
						? -1
						: b.pack.manifest.id === DEFAULT_ID
							? 1
							: a.pack.manifest.name.localeCompare(b.pack.manifest.name),
				)
				.map(summary),
		has: (id) => loaded.has(id),
		stylesheet(id) {
			const entry = loaded.get(id);
			return entry ? { version: entry.version, css: entry.css } : null;
		},
		font(id, file) {
			const entry = loaded.get(id);
			const bytes =
				entry && Object.hasOwn(entry.pack.fonts, file) ? entry.pack.fonts[file] : undefined;
			if (!entry || !bytes) return null;
			// `file` is one of the pack's own validated names, so the path cannot leave its folder.
			return { stream: createReadStream(join(entry.dir, file)), size: bytes.length };
		},
		async install(input) {
			const result = validateThemePack(input, {
				appVersion,
				styles: STYLE_IDS,
				...(defaults && { fallback: defaults }),
			});
			if (!result.ok) throw refusal(result.errors);
			const { pack, warnings } = result;
			const id = pack.manifest.id;
			const installedCount = [...loaded.values()].filter((l) => l.source === 'installed').length;
			if (installedCount >= MAX_INSTALLED && loaded.get(id)?.source !== 'installed')
				throw new FamosError('conflict', 'Too many theme packs are installed');
			const raw = input as { tokens: unknown };
			await writeThemeDir(join(options.installedDir, id), {
				manifest: pack.manifest,
				tokens: raw.tokens,
				fonts: pack.fonts,
			});
			reload();
			const entry = loaded.get(id);
			if (entry?.source !== 'installed')
				throw new FamosError('unavailable', 'The pack could not be loaded after installing');
			return { theme: summary(entry), warnings };
		},
		async remove(id) {
			if (loaded.get(id)?.source !== 'installed')
				throw new FamosError('not_found', 'That pack is not installed');
			// The id is a pack's own (validated) id, so the folder name cannot leave the directory.
			await rm(join(options.installedDir, id), { recursive: true, force: true });
			reload();
		},
	};
}
