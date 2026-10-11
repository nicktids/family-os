import { type AppContext, namespaced, useApp } from '@famos/ui/app';
import type en from '../messages/en.json';

export type PetsT = ReturnType<typeof namespaced<typeof en>>;

/** The pets translator: keys are typed by the English catalog. */
export function usePets(): { app: AppContext; t: PetsT } {
	const app = useApp();
	return { app, t: namespaced<typeof en>(app, 'pets') };
}
