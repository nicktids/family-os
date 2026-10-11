import { type AppContext, namespaced, useApp } from '@famos/ui/app';
import type en from '../messages/en.json';

export type KitchenT = ReturnType<typeof namespaced<typeof en>>;

/** The kitchen translator: keys are typed by the English catalog. */
export function useKitchen(): { app: AppContext; t: KitchenT } {
	const app = useApp();
	return { app, t: namespaced<typeof en>(app, 'kitchen') };
}
