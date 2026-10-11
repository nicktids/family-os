import { describe, expect, it } from 'vitest';
import { createLineLogger } from '../src/runtime/logger.ts';
import { createUuidv7 } from '../src/runtime/uuidv7.ts';

function capture(level?: string) {
	const lines: Record<string, unknown>[] = [];
	const logger = createLineLogger({
		level,
		now: () => 1234,
		write: (line) => lines.push(JSON.parse(line)),
	});
	return { lines, logger };
}

describe('line logger', () => {
	it('writes pino-shaped lines and filters by level', () => {
		const { lines, logger } = capture('warn');
		logger.info({ a: 1 }, 'hidden');
		logger.debug({ a: 1 }, 'hidden');
		logger.warn({ a: 2 }, 'shown');
		logger.error({}, 'bad');
		expect(lines).toEqual([
			{ level: 40, time: 1234, a: 2, msg: 'shown' },
			{ level: 50, time: 1234, msg: 'bad' },
		]);
	});

	it('redacts secret keys at any depth', () => {
		const { lines, logger } = capture();
		logger.info(
			{
				token: 'top',
				user: { password: 'p', pin: '1234', name: 'x' },
				req: { headers: { cookie: 'c', Authorization: 'a', accept: 'y' } },
				deep: { a: [{ apiKey: 'k' }] },
			},
			'x',
		);
		expect(lines[0]).toMatchObject({
			token: '[Redacted]',
			user: { password: '[Redacted]', pin: '[Redacted]', name: 'x' },
			req: { headers: { cookie: '[Redacted]', Authorization: '[Redacted]', accept: 'y' } },
			deep: { a: [{ apiKey: '[Redacted]' }] },
		});
	});

	it('logs circular objects instead of throwing', () => {
		const { lines, logger } = capture();
		const loop: Record<string, unknown> = { name: 'a' };
		loop.self = loop;
		logger.info({ loop }, 'x');
		expect(lines[0]).toMatchObject({ loop: { name: 'a', self: '[Circular]' } });
	});

	it('serialises errors under err', () => {
		const { lines, logger } = capture();
		logger.error({ err: new TypeError('boom') }, 'failed');
		const err = lines[0]?.err as Record<string, string>;
		expect(err.type).toBe('TypeError');
		expect(err.message).toBe('boom');
		expect(err.stack).toContain('boom');
	});

	it('merges child bindings and does not leak them to the parent', () => {
		const { lines, logger } = capture();
		const child = logger.child({ component: 'a' }).child({ job: 'j' });
		child.info({ n: 1 }, 'hi');
		logger.info({}, 'plain');
		expect(lines[0]).toMatchObject({ component: 'a', job: 'j', n: 1, msg: 'hi' });
		expect(lines[1]).not.toHaveProperty('component');
	});
});

describe('uuidv7', () => {
	it('has the RFC 9562 format, version and variant', () => {
		const next = createUuidv7();
		for (let i = 0; i < 100; i++) {
			const id = next();
			expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
		}
	});

	it('encodes the timestamp in the first 48 bits', () => {
		const id = createUuidv7(() => 1_700_000_000_123)();
		expect(Number.parseInt(id.replace(/-/g, '').slice(0, 12), 16)).toBe(1_700_000_000_123);
	});

	it('is strictly increasing across 10,000 ids in a tight loop', () => {
		const next = createUuidv7();
		let prev = next();
		for (let i = 0; i < 10_000; i++) {
			const id = next();
			expect(id > prev).toBe(true);
			prev = id;
		}
	});

	it('stays ordered when the clock stands still or goes backwards', () => {
		let t = 5000;
		const next = createUuidv7(() => t);
		const ids: string[] = [];
		for (let i = 0; i < 6000; i++) ids.push(next()); // overflows the counter within one ms
		t = 1000;
		for (let i = 0; i < 10; i++) ids.push(next());
		t = 9000;
		ids.push(next());
		expect([...ids].sort()).toEqual(ids);
		expect(new Set(ids).size).toBe(ids.length);
	});
});
