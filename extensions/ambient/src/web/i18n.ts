import { type AppContext, namespaced, useApp } from '@famos/ui/app';
import type en from '../messages/en.json';

export type AmbientT = ReturnType<typeof namespaced<typeof en>>;

/** The ambient translator: keys are typed by the English catalog. */
export function useAmbient(): { app: AppContext; t: AmbientT } {
	const app = useApp();
	return { app, t: namespaced<typeof en>(app, 'ambient') };
}
