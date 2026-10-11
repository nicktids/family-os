import { type AppContext, namespaced, useApp } from '@famos/ui/app';
import type en from '../messages/en.json';

export type RecordsT = ReturnType<typeof namespaced<typeof en>>;

/** The records translator: keys are typed by the English catalog. */
export function useRecords(): { app: AppContext; t: RecordsT } {
	const app = useApp();
	return { app, t: namespaced<typeof en>(app, 'records') };
}
