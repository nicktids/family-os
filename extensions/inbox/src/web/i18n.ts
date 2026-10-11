import { type AppContext, namespaced, useApp } from '@famos/ui/app';
import type en from '../messages/en.json';

export type InboxT = ReturnType<typeof namespaced<typeof en>>;

/** The inbox translator: keys are typed by the English catalog. */
export function useInbox(): { app: AppContext; t: InboxT } {
	const app = useApp();
	return { app, t: namespaced<typeof en>(app, 'inbox') };
}
