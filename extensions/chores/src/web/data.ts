import { unwrap } from '@famos/api-client';
import type { AppContext } from '@famos/ui/app';
import { sharedRead } from '@famos/ui/famos';
import type {
	Chore,
	CreateChoreInput,
	MarkDoneResult,
	TodayChores,
	UpdateChoreInput,
} from '../contract/index.js';
import { api } from './api.js';

/** Chores API calls, all through the generated client. */
export type Outcome = 'applied' | 'drafted' | 'queued';

export const loadChores = async (): Promise<Chore[]> =>
	unwrap(await api.GET('/api/v1/chores/chores')) as Chore[];

/** Today's chores per person (`null`: anyone), as the rings on Today count them. */
export const loadTodayByMember = (): Promise<TodayChores[]> =>
	sharedRead('/api/v1/chores/today', async () => unwrap(await api.GET('/api/v1/chores/today')));

/**
 * Ticks a chore off for the signed-in person, or for its assignee when an editor taps.
 * The tap is kept on this device without a connection. Returns the result, 'queued', or null
 * when the tap changed nothing.
 */
export async function markDone(
	app: Pick<AppContext, 'runAction' | 'can'>,
	chore: Chore,
	label: string,
): Promise<MarkDoneResult | 'queued' | null> {
	if (!chore.nextDue) return null;
	// Someone who can edit may tick off another person's turn: it counts for the one whose turn it
	// was, so the rotation and "least done" stay fair. Otherwise it counts for the person tapping.
	const doneBy = app.can('chores.edit') ? (chore.assigneeId ?? undefined) : undefined;
	const result = await app.runAction<MarkDoneResult>(
		'chores.markDone',
		{ id: chore.id, dueDate: chore.nextDue, ...(doneBy && { doneBy }) },
		{ offline: true, label },
	);
	if (result.queued) return 'queued';
	return result.status === 'applied' ? result.output : null;
}

export const undoDone = async (
	app: Pick<AppContext, 'runAction'>,
	completionId: string,
	label: string,
): Promise<Outcome> => {
	const result = await app.runAction('chores.undoDone', { completionId }, { offline: true, label });
	return result.queued ? 'queued' : result.status;
};

export async function createChore(
	input: CreateChoreInput,
): Promise<{ outcome: Outcome; id: string | null }> {
	const result = unwrap(await api.POST('/api/v1/actions/chores.createChore', { body: input }));
	return { outcome: result.status, id: result.status === 'applied' ? result.output.id : null };
}

export const updateChore = async (input: UpdateChoreInput): Promise<Outcome> =>
	unwrap(await api.POST('/api/v1/actions/chores.updateChore', { body: input })).status;

export const setAssignees = async (id: string, memberIds: string[]): Promise<Outcome> =>
	unwrap(await api.POST('/api/v1/actions/chores.setAssignees', { body: { id, memberIds } })).status;

export const archiveChore = async (id: string): Promise<Outcome> =>
	unwrap(await api.POST('/api/v1/actions/chores.archiveChore', { body: { id } })).status;
