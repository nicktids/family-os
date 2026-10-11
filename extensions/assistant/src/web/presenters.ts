import type { DraftPresenter, PresenterContext } from '@famos/ui/slots';
import { BookmarkPlus } from '@lucide/svelte';

const tr = (c: PresenterContext, key: string, options?: Record<string, unknown>) =>
	c.t(`assistant:${key}`, options);

interface MemoryInput {
	text: string;
}

/** "Remember: …?" The note is private to the person who sees this card. */
export const addMemoryPresenter: DraftPresenter<MemoryInput> = {
	actionId: 'core.addMemory',
	kind: (c) => tr(c, 'kind_memory'),
	icon: BookmarkPlus,
	title: (input, c) => tr(c, 'remember_title', { text: input.text }),
	fields: () => [],
	approveLabel: (c) => tr(c, 'remember_approve'),
};
