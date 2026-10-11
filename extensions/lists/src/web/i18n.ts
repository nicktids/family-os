import { type AppContext, namespaced, useApp } from '@famos/ui/app';
import type en from '../messages/en.json';

export type ListsT = ReturnType<typeof namespaced<typeof en>>;

/** The lists translator: keys are typed by the English catalog. */
export function useLists(): { app: AppContext; t: ListsT } {
	const app = useApp();
	return { app, t: namespaced<typeof en>(app, 'lists') };
}
