import { type AppContext, namespaced, useApp } from '@famos/ui/app';
import type en from '../messages/en.json';

export type VehiclesT = ReturnType<typeof namespaced<typeof en>>;

/** The vehicles translator: keys are typed by the English catalog. */
export function useVehicles(): { app: AppContext; t: VehiclesT } {
	const app = useApp();
	return { app, t: namespaced<typeof en>(app, 'vehicles') };
}
