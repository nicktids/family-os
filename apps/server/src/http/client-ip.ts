import { isIP } from 'node:net';
import type { Context } from 'hono';

/**
 * The client address for rate limits and lockouts. It comes from the socket; `X-Forwarded-For` is
 * honoured only when the socket peer is a configured trusted proxy, and then the right-most address
 * that is not itself a trusted proxy wins (the left part of the header is client-controlled).
 */
export function createClientIp(trustedProxies: readonly string[]) {
	const trusted = trustedProxies.map(parseRange).filter((r) => r !== null);
	const isTrusted = (address: string) => trusted.some((range) => inRange(address, range));
	return (c: Context): string => {
		// No socket means an in-process call (tests, `app.request`): it comes from this host.
		const peer = normalize(socketAddress(c) ?? '127.0.0.1');
		if (!isTrusted(peer)) return peer;
		const forwarded = (c.req.header('x-forwarded-for') ?? '')
			.split(',')
			.map((part) => normalize(part.trim()))
			.filter((part) => isIP(part) !== 0);
		for (let i = forwarded.length - 1; i >= 0; i--) {
			const address = forwarded[i] as string;
			if (!isTrusted(address)) return address;
		}
		return forwarded[0] ?? peer;
	};
}

function socketAddress(c: Context): string | undefined {
	const env = c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined;
	return env?.incoming?.socket?.remoteAddress;
}

/** `::ffff:192.0.2.1` is the IPv4 address seen through a dual-stack socket. */
function normalize(address: string): string {
	const lower = address.toLowerCase();
	return lower.startsWith('::ffff:') && isIP(lower.slice(7)) === 4 ? lower.slice(7) : lower;
}

type Range = { version: 4 | 6; bits: bigint; prefix: number };

function parseRange(value: string): Range | null {
	const [address = '', prefixText] = value.trim().split('/');
	const ip = normalize(address);
	const version = isIP(ip);
	if (version === 0) return null;
	const max = version === 4 ? 32 : 128;
	const prefix = prefixText === undefined ? max : Number(prefixText);
	if (!Number.isInteger(prefix) || prefix < 0 || prefix > max) return null;
	return { version: version as 4 | 6, bits: toBits(ip, version as 4 | 6), prefix };
}

function inRange(address: string, range: Range): boolean {
	const version = isIP(address);
	if (version !== range.version) return false;
	const max = version === 4 ? 32 : 128;
	const shift = BigInt(max - range.prefix);
	return toBits(address, range.version) >> shift === range.bits >> shift;
}

function toBits(ip: string, version: 4 | 6): bigint {
	if (version === 4) return ip.split('.').reduce((acc, part) => (acc << 8n) | BigInt(part), 0n);
	const [head = '', tail] = ip.split('::');
	const parts = (text: string) => (text ? text.split(':') : []);
	const left = parts(head);
	const right = tail === undefined ? [] : parts(tail);
	// An embedded IPv4 tail (`::ffff:10.0.0.1` forms that did not normalize) counts as two groups.
	const expand = (groups: string[]) =>
		groups.flatMap((g) => {
			if (!g.includes('.')) return [g];
			const n = Number(toBits(g, 4));
			return [(n >>> 16).toString(16), (n & 0xffff).toString(16)];
		});
	const l = expand(left);
	const r = expand(right);
	const groups = [...l, ...Array(8 - l.length - r.length).fill('0'), ...r];
	return groups.reduce((acc, g) => (acc << 16n) | BigInt(Number.parseInt(g, 16)), 0n);
}
