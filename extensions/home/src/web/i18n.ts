import { type AppContext, namespaced, useApp } from '@famos/ui/app';
import type en from '../messages/en.json';

export type HomeT = ReturnType<typeof namespaced<typeof en>>;

/** The home translator: keys are typed by the English catalog. */
export function useHome(): { app: AppContext; t: HomeT } {
	const app = useApp();
	return { app, t: namespaced<typeof en>(app, 'home') };
}
