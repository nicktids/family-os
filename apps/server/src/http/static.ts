import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { serveStatic } from '@hono/node-server/serve-static';
import type { Hono } from 'hono';

/**
 * Serves the built SPA. Hashed assets under /_app/immutable are cached forever; the shell,
 * manifest and service worker are always revalidated so updates reach kiosks. Unknown non-API paths fall back to index.html for client routing.
 */
// biome-ignore lint/suspicious/noExplicitAny: works with any Hono env.
export function mountSpa(app: Hono<any>, webDir: string): void {
	app.use('/_app/immutable/*', async (c, next) => {
		await next();
		c.header('cache-control', 'public, max-age=31536000, immutable');
	});
	app.use('*', async (c, next) => {
		await next();
		if (!c.res.headers.has('cache-control') && !c.req.path.startsWith('/api/'))
			c.header('cache-control', 'no-cache');
	});
	app.use('*', serveStatic({ root: webDir }));

	let shell: { html: string; csp: string } | undefined;
	app.get('*', async (c, next) => {
		if (c.req.path.startsWith('/api/') || c.req.path === '/health') return next();
		if (!shell) {
			const html = await readFile(join(webDir, 'index.html'), 'utf8');
			shell = { html, csp: contentSecurityPolicy(html) };
		}
		c.header('content-security-policy', shell.csp);
		return c.html(shell.html);
	});
}

/**
 * The SPA's policy: only our own scripts, plus the inline scripts of the built shell (SvelteKit's
 * bootstrap, the theme script) allowed by hash. Styles allow inline because Svelte sets style
 * attributes; images allow blob: for local previews (share page) and data: for small icons.
 */
export function contentSecurityPolicy(html: string): string {
	const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
		([, body]) =>
			`'sha256-${createHash('sha256')
				.update(body ?? '')
				.digest('base64')}'`,
	);
	return [
		"default-src 'self'",
		`script-src 'self' ${hashes.join(' ')}`.trim(),
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' data: blob:",
		"connect-src 'self'",
		"font-src 'self'",
		"worker-src 'self'",
		"manifest-src 'self'",
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'none'",
	].join('; ');
}
