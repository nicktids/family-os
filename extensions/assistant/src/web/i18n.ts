import { type AppContext, namespaced, useApp } from '@famos/ui/app';
import type en from '../messages/en.json';

export type AssistantT = ReturnType<typeof namespaced<typeof en>>;

/** The assistant translator: keys are typed by the English catalog. */
export function useAssistant(): { app: AppContext; t: AssistantT } {
	const app = useApp();
	return { app, t: namespaced<typeof en>(app, 'assistant') };
}
