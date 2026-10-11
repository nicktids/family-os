import type { Actor } from '@famos/sdk';
import { afterEach, describe, expect, it } from 'vitest';
import type { CoreTables } from '../src/tables.ts';
import { createTestKernel, type TestKernel } from './harness.ts';

let k: TestKernel;
afterEach(() => k.close());

const display = (deviceId: string): Actor => ({
	kind: 'display',
	deviceId,
	capabilities: [],
	showNames: true,
});

async function addDevice(id: string, kind: 'kiosk' | 'family' = 'kiosk') {
	await k.ctx.db
		.withTables<CoreTables>()
		.insertInto('core_devices')
		.values({
			id,
			name: id,
			kind,
			token_hash: `hash-${id}`,
			created_by: 'test',
			created_at: 1,
			last_seen_at: 1,
			revoked_at: null,
			display_capabilities: '[]',
			display_show_names: 1,
		})
		.execute();
}

const look = (actor?: Actor) => k.themes.effective(k.ctx.db, actor);

describe('what Today shows', () => {
	it('shows everything until someone hides a block', async () => {
		k = await createTestKernel();
		const { actor } = await k.member('member');
		expect(await look(actor)).toMatchObject({ hidden: [], familyHidden: [], myHidden: null });
		const route = await k.route('core.getAppearance').call({ actor });
		expect(route).toMatchObject({ hidden: [], familyHidden: [], myHidden: null });
	});

	it("lets the family hide blocks, and a person's own choice win over the family's", async () => {
		k = await createTestKernel();
		const { actor: admin } = await k.member('admin');
		const { actor: kid } = await k.member('member');
		await k.runner.invoke('core.setFamilyTodayBlocks', { hidden: ['weather', 'photo'] }, admin);
		expect(await look(kid)).toMatchObject({
			hidden: ['weather', 'photo'],
			familyHidden: ['weather', 'photo'],
			myHidden: null,
		});

		// An empty list of one's own shows everything, whatever the family hides.
		const mine = await k.runner.invoke('core.setMyTodayBlocks', { hidden: [] }, kid);
		expect(mine).toMatchObject({ status: 'applied', output: { hidden: [] } });
		expect(await look(kid)).toMatchObject({ hidden: [], myHidden: [] });
		await k.runner.invoke(
			'core.setMyTodayBlocks',
			{ hidden: ['board.today', 'board.today', 'needs'] },
			kid,
		);
		expect(await look(kid)).toMatchObject({ hidden: ['board.today', 'needs'] });
		// It changes nothing for anyone else.
		expect(await look(admin)).toMatchObject({ hidden: ['weather', 'photo'], myHidden: null });

		// Back to following the family.
		await k.runner.invoke('core.setMyTodayBlocks', { hidden: null }, kid);
		expect(await look(kid)).toMatchObject({ hidden: ['weather', 'photo'], myHidden: null });
	});

	it("gives a display its own set over the family's, and only for displays", async () => {
		k = await createTestKernel();
		const { actor: admin } = await k.member('admin');
		await addDevice('dev_kitchen');
		await addDevice('dev_phone', 'family');
		await k.runner.invoke('core.setFamilyTodayBlocks', { hidden: ['photo'] }, admin);
		expect((await look(display('dev_kitchen'))).hidden).toEqual(['photo']);

		await k.runner.invoke(
			'core.setDisplayTodayBlocks',
			{ deviceId: 'dev_kitchen', hidden: ['clock'] },
			admin,
		);
		expect((await look(display('dev_kitchen'))).hidden).toEqual(['clock']);
		expect(await k.route('core.listDisplayTodayBlocks').call({ actor: admin })).toEqual({
			dev_kitchen: ['clock'],
		});
		// Another display and the family are untouched.
		expect((await look(display('dev_other'))).hidden).toEqual(['photo']);
		expect((await look(admin)).hidden).toEqual(['photo']);

		await expect(
			k.runner.invoke('core.setDisplayTodayBlocks', { deviceId: 'dev_phone', hidden: [] }, admin),
		).rejects.toMatchObject({ code: 'not_found' });
		await k.runner.invoke(
			'core.setDisplayTodayBlocks',
			{ deviceId: 'dev_kitchen', hidden: null },
			admin,
		);
		expect((await look(display('dev_kitchen'))).hidden).toEqual(['photo']);
	});

	it('keeps unknown ids (a block of a future extension) and skips what is not an id', async () => {
		k = await createTestKernel();
		const { actor: admin } = await k.member('admin');
		await k.ctx.db
			.withTables<CoreTables>()
			.insertInto('core_settings')
			.values({
				key: 'today.hidden',
				value: JSON.stringify({ family: ['garden.today', 42, 'Bad Id'], members: 'x' }),
				updated_at: 1,
			})
			.execute();
		expect(await look(admin)).toMatchObject({ hidden: ['garden.today'], myHidden: null });
		await expect(
			k.runner.invoke('core.setMyTodayBlocks', { hidden: ['Not An Id'] }, admin),
		).rejects.toMatchObject({ code: 'bad_request' });
	});

	it('lets everyone choose their own, but only admins the family and display sets', async () => {
		k = await createTestKernel();
		const { actor: kid } = await k.member('member');
		await addDevice('dev_kitchen');
		await expect(
			k.runner.invoke('core.setFamilyTodayBlocks', { hidden: ['weather'] }, kid),
		).rejects.toMatchObject({ code: 'forbidden' });
		await expect(
			k.runner.invoke(
				'core.setDisplayTodayBlocks',
				{ deviceId: 'dev_kitchen', hidden: ['weather'] },
				kid,
			),
		).rejects.toMatchObject({ code: 'forbidden' });
		expect(
			await k.runner.invoke('core.setMyTodayBlocks', { hidden: ['weather'] }, kid),
		).toMatchObject({ status: 'applied' });
	});
});
