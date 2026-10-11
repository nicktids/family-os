import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { createClientIp } from '../src/http/client-ip.ts';

async function ipOf(trusted: string[], peer: string | undefined, forwarded?: string) {
	const app = new Hono();
	const clientIp = createClientIp(trusted);
	app.get('/', (c) => c.text(clientIp(c)));
	const env = peer ? { incoming: { socket: { remoteAddress: peer } } } : undefined;
	const res = await app.request(
		'/',
		{ headers: forwarded ? { 'x-forwarded-for': forwarded } : {} },
		env,
	);
	return res.text();
}

describe('client IP', () => {
	it('ignores X-Forwarded-For unless the peer is a trusted proxy', async () => {
		expect(await ipOf([], '203.0.113.7', '10.0.0.1')).toBe('203.0.113.7');
		expect(await ipOf(['172.16.0.0/12'], '203.0.113.7', '10.0.0.1')).toBe('203.0.113.7');
	});

	it('takes the right-most untrusted address behind trusted proxies', async () => {
		expect(await ipOf(['172.16.0.0/12'], '172.18.0.2', 'spoofed, 198.51.100.4')).toBe(
			'198.51.100.4',
		);
		expect(
			await ipOf(['172.16.0.0/12', '10.0.0.5'], '::ffff:172.18.0.2', '198.51.100.4, 10.0.0.5'),
		).toBe('198.51.100.4');
		expect(await ipOf(['fd00::/8'], 'fd00::1', '2001:db8::9')).toBe('2001:db8::9');
	});

	it('treats in-process calls as local', async () => {
		expect(await ipOf([], undefined, '10.0.0.1')).toBe('127.0.0.1');
		expect(await ipOf(['127.0.0.1'], undefined, '10.0.0.1')).toBe('10.0.0.1');
	});
});
