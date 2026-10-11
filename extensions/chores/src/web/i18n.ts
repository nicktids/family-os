import { type AppContext, namespaced, useApp } from '@famos/ui/app';
import type en from '../messages/en.json';

export type ChoresT = ReturnType<typeof namespaced<typeof en>>;

/** The chores translator: keys are typed by the English catalog. */
export function useChores(): { app: AppContext; t: ChoresT } {
	const app = useApp();
	return { app, t: namespaced<typeof en>(app, 'chores') };
}
