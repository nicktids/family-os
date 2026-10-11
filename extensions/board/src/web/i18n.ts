import { type AppContext, namespaced, useApp } from '@famos/ui/app';
import type en from '../messages/en.json';

export type BoardT = ReturnType<typeof namespaced<typeof en>>;

/** The board translator: keys are typed by the English catalog. */
export function useBoard(): { app: AppContext; t: BoardT } {
	const app = useApp();
	return { app, t: namespaced<typeof en>(app, 'board') };
}
