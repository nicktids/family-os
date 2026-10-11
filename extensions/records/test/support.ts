import { type Actor, systemActor } from '@famos/sdk';
import { createFakeChannel, createTestKernel, type TestKernel } from '@famos/testing';
import { epochOf } from '@famos/time';
import records from '../src/server/index.ts';

export const TZ = 'Europe/Istanbul';

/** A typed id like a domain extension would hand out (`vehicle_<uuid>`). */
export const recordId = (prefix: string, n = 1) =>
	`${prefix}_00000000-0000-7000-8000-${String(n).padStart(12, '0')}`;
export const CAR = recordId('vehicle', 1);
export const OTHER_CAR = recordId('vehicle', 2);

export const at = (date: string, time: string) => epochOf(date, time, TZ);

export async function createKernel(extra: Parameters<typeof createTestKernel>[0] = {}) {
	const channel = createFakeChannel('web');
	const k = await createTestKernel({
		channels: [channel],
		translate: (locale, key, params) => `${locale}|${key}|${JSON.stringify(params ?? {})}`,
		...extra,
		extensions: [records, ...(extra.extensions ?? [])],
	});
	await k.runner.invoke(
		'core.updateFamilySettings',
		{ timeZone: TZ, formatLocale: 'en-GB', hourCycle: 'h23' },
		systemActor('test'),
	);
	k.clock.set(at('2026-10-06', '10:00'));
	return { k, channel };
}

export type Person = { id: string; actor: Actor };

export async function person(k: TestKernel, roleId: string, name = roleId): Promise<Person> {
	const { actor, member } = await k.member(roleId, name);
	return { id: member.id, actor };
}

export async function applied<T>(
	k: TestKernel,
	actionId: string,
	input: unknown,
	actor: Actor,
): Promise<T> {
	const r = await k.runner.invoke<T>(actionId, input, actor);
	if (r.status !== 'applied') throw new Error(`expected ${actionId} to be applied`);
	return r.output;
}
