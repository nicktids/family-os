import type { CoreTables, Kernel } from '@famos/core';
import { type Actor, FamosError, type MemberId, type UploadedFile } from '@famos/sdk';
import { mimeAccepted } from './http/uploads.ts';

/** The member as an actor, or null when they are archived or unknown. */
export async function memberActor(kernel: Kernel, memberId: string): Promise<Actor | null> {
	const row = await kernel.ctx.db
		.withTables<CoreTables>()
		.selectFrom('core_members')
		.select(['id', 'role_id'])
		.where('id', '=', memberId)
		.where('archived_at', 'is', null)
		.executeTakeFirst();
	return row ? { kind: 'member', memberId: row.id as MemberId, roleId: row.role_id } : null;
}

const asUploaded = (file: { name: string; type: string; bytes: Uint8Array }): UploadedFile => ({
	field: 'files',
	name: file.name,
	type: file.type,
	size: file.bytes.length,
	stream: async function* () {
		yield file.bytes;
	},
	bytes: async () => file.bytes,
});

/**
 * Adds something to the Inbox as a member, for channels that are not the HTTP API (Telegram,
 * email). It goes through the Inbox's own upload route, so capabilities, quotas, feature
 * switches and photo metadata stripping apply exactly as for an upload from the app.
 * Throws a `FamosError` when the Inbox refuses.
 */
export async function shareToInbox(
	kernel: Kernel,
	share: {
		memberId: string;
		channel: 'telegram' | 'email';
		title?: string;
		text?: string;
		url?: string;
		files: { name: string; type: string; bytes: Uint8Array }[];
	},
): Promise<void> {
	if (!kernel.features.isOn('inbox')) throw new FamosError('feature_off', 'The Inbox is off');
	const route = kernel.registry.routes.find(
		(r) => r.route.operationId === 'inbox.createItem',
	)?.route;
	const upload = route?.upload;
	if (!route || !upload || !route.body) throw new FamosError('feature_off', 'No Inbox');
	const actor = await memberActor(kernel, share.memberId);
	if (!actor) throw new FamosError('forbidden', 'Not a member');
	// The route checks are the HTTP layer's job normally; here we are that layer.
	if (!kernel.access.can(actor, route.requires))
		throw new FamosError('forbidden', 'Not allowed to share to the Inbox');
	const { files } = share;
	const total = files.reduce((sum, f) => sum + f.bytes.length, 0);
	if (
		files.length > upload.maxFiles ||
		total > upload.maxBytes ||
		files.some((f) => !mimeAccepted(f.type, upload.accept))
	)
		throw new FamosError('bad_request', 'This file cannot be added');
	const body = route.body.parse({
		channel: share.channel,
		...(share.title !== undefined && { title: share.title }),
		...(share.text !== undefined && { text: share.text }),
		...(share.url !== undefined && { url: share.url }),
	});
	await route.handle(kernel.ctx, {
		params: undefined,
		query: undefined,
		body,
		actor,
		device: null,
		files: files.map(asUploaded),
	});
}
