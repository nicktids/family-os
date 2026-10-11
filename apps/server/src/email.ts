import type { Email } from '@famos/adapters/email';
import { type Kernel, memberChanged } from '@famos/core';
import { shareToInbox } from './inbox-share.ts';

/**
 * Connects the email adapter to the kernel. Mail from an allowed sender goes through
 * the Inbox's upload route as the member the address belongs to, so capabilities, quotas,
 * feature switches and photo metadata stripping apply unchanged.
 */
export function wireEmail(email: Email, kernel: Kernel): void {
	email.setHandlers({
		async onShare({ memberId, title, text, files }) {
			await shareToInbox(kernel, {
				memberId,
				channel: 'email',
				...(title !== undefined && { title }),
				...(text !== undefined && { text }),
				files,
			});
		},
	});

	// A member who left cannot receive mail any more: their addresses are removed.
	kernel.bus.on(memberChanged, async ({ memberId, endSessions }) => {
		if (endSessions) await email.removeSendersOf(memberId);
	});
}
