import http from 'node:http';
import type { AddressInfo } from 'node:net';

/** A tiny WebDAV folder: enough for MKCOL, PUT, DELETE and PROPFIND. */
export async function startFakeDav() {
	const files = new Map<string, Buffer>();
	const server = http.createServer((req, res) => {
		const chunks: Buffer[] = [];
		req.on('data', (c: Buffer) => chunks.push(c));
		req.on('end', () => {
			const name = decodeURIComponent((req.url ?? '').replace(/^\/dav\/?/, ''));
			if (req.method === 'PUT') files.set(name, Buffer.concat(chunks));
			if (req.method === 'DELETE') files.delete(name);
			if (req.method === 'PROPFIND') {
				const entries = [...files.keys()]
					.map((n) => `<d:response><d:href>/dav/${encodeURIComponent(n)}</d:href></d:response>`)
					.join('');
				return void res
					.writeHead(207)
					.end(`<d:multistatus xmlns:d="DAV:">${entries}</d:multistatus>`);
			}
			res.writeHead(req.method === 'MKCOL' ? 405 : 201).end();
		});
	});
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	return {
		files,
		url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/dav`,
		close: () =>
			new Promise<void>((resolve) => {
				server.closeAllConnections();
				server.close(() => resolve());
			}),
	};
}

export type FakeDav = Awaited<ReturnType<typeof startFakeDav>>;
