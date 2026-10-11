import { defineAction, defineCapability, defineExtension } from '@famos/sdk';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildRegistry, orderExtensions } from '../src/registry.ts';

const ext = (id: string, dependsOn: string[] = []) => defineExtension({ id, dependsOn });

describe('registry', () => {
	it('orders extensions after their dependencies', () => {
		const ordered = orderExtensions([
			ext('tasks', ['calendar']),
			ext('calendar'),
			ext('inbox', ['tasks']),
		]);
		expect(ordered.map((e) => e.id)).toEqual(['calendar', 'tasks', 'inbox']);
	});

	it('rejects cycles, missing dependencies and duplicates', () => {
		expect(() => orderExtensions([ext('a', ['b']), ext('b', ['a'])])).toThrow(/cycle/);
		expect(() => orderExtensions([ext('a', ['zzz'])])).toThrow(/missing/);
		expect(() => orderExtensions([ext('a'), ext('a')])).toThrow(/Duplicate/);
	});

	it('rejects contributions outside the extension namespace', () => {
		const action = defineAction({
			id: 'other.doThing',
			title: 't',
			input: z.object({}),
			output: z.object({}),
			run: async () => ({}),
		});
		expect(() => defineExtension({ id: 'mine', actions: [action] })).toThrow(/namespaced/);
	});

	it('rejects duplicate action ids across extensions', () => {
		const action = defineAction({
			id: 'a.doThing',
			title: 't',
			input: z.object({}),
			output: z.object({}),
			run: async () => ({}),
		});
		const one = defineExtension({ id: 'a', actions: [action] });
		const two = { ...defineExtension({ id: 'b' }), actions: [action] };
		expect(() => buildRegistry([one, two])).toThrow(/Duplicate action/);
	});

	it('allows AI hints on read-only actions (read tools) but not on direct changes', () => {
		const view = defineCapability({ id: 'mail.view', label: 'mail:cap', level: 'view' });
		const make = (extra: Record<string, unknown>) =>
			defineAction({
				id: 'mail.look',
				title: 't',
				input: z.object({}),
				output: z.object({}),
				ai: { description: 'looks' },
				run: async () => ({}),
				...extra,
			});
		const build = (action: ReturnType<typeof make>) =>
			buildRegistry([defineExtension({ id: 'mail', capabilities: [view], actions: [action] })]);
		expect(() => build(make({ readOnly: true, requires: view.id }))).not.toThrow();
		expect(() => build(make({ requires: view.id, approval: 'never' }))).toThrow(
			/would apply AI changes directly/,
		);
		expect(() => build(make({ readOnly: true, requires: view.id, external: true }))).toThrow(
			/external and cannot have AI hints/,
		);
	});

	it('refuses AI hints on an action that sends data outside', () => {
		const manage = defineCapability({ id: 'mail.manage', label: 'mail:cap', level: 'manage' });
		const send = (ai: boolean) =>
			defineAction({
				id: 'mail.sendNote',
				title: 't',
				input: z.object({}),
				output: z.object({}),
				approval: 'always',
				requires: manage.id,
				external: true,
				...(ai && { ai: { description: 'Sends a note' } }),
				run: async () => ({}),
			});
		expect(() =>
			buildRegistry([
				defineExtension({ id: 'mail', capabilities: [manage], actions: [send(true)] }),
			]),
		).toThrow(/external and cannot have AI hints/);
		expect(() =>
			buildRegistry([
				defineExtension({ id: 'mail', capabilities: [manage], actions: [send(false)] }),
			]),
		).not.toThrow();
	});
});
