import { type AppContext, namespaced, useApp } from '@famos/ui/app';
import type en from '../messages/en.json';

/** Calendar's translator: keys are typed by the English catalog. */
export function useCalendar(): { app: AppContext; t: ReturnType<typeof namespaced<typeof en>> } {
	const app = useApp();
	return { app, t: namespaced<typeof en>(app, 'calendar') };
}
