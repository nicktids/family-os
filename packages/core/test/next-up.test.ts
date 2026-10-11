import type { Actor } from '@famos/sdk';
import { afterEach, describe, expect, it } from 'vitest';
import { createTestKernel, type TestKernel } from './harness.ts';

let k: TestKernel;
afterEach(() => k.close());

const display: Actor = {
	kind: 'display',
	deviceId: 'dev_kitchen',
	capabilities: ['core.notifications.receive'],
	showNames: true,
};

const nextUp = async (actor: Actor) => (await k.route('core.getMe').call({ actor })).nextUp;

describe('core.setMyNextUp', () => {
	it('is Family by default and remembers a member’s own choice, for them only', async () => {
		k = await createTestKernel();
		const { actor: kid } = await k.member('member');
		const { actor: admin } = await k.member('admin');
		expect(await nextUp(kid)).toBe('family');

		const result = await k.runner.invoke('core.setMyNextUp', { mode: 'me' }, kid);
		expect(result).toMatchObject({ status: 'applied', output: { mode: 'me' } });
		expect(await nextUp(kid)).toBe('me');
		expect(await nextUp(admin)).toBe('family');

		await k.runner.invoke('core.setMyNextUp', { mode: 'family' }, kid);
		expect(await nextUp(kid)).toBe('family');
	});

	it('refuses an unknown mode', async () => {
		k = await createTestKernel();
		const { actor } = await k.member('member');
		await expect(
			k.runner.invoke('core.setMyNextUp', { mode: 'everyone' }, actor),
		).rejects.toMatchObject({ code: 'bad_request' });
	});

	it('is for people only: a display cannot choose', async () => {
		k = await createTestKernel();
		await expect(
			k.runner.invoke('core.setMyNextUp', { mode: 'me' }, display),
		).rejects.toMatchObject({ code: 'forbidden' });
	});
});
