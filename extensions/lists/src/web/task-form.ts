import { Temporal, WEEKDAYS, type Weekday } from '@famos/time';
import type { RepeatPreset } from '@famos/ui/famos';
import { type Task, type TaskInput, TaskInputSchema } from '../contract/index.js';

/** Editable task form state; plain strings so inputs can bind to them. */
export interface TaskFormValue {
	title: string;
	/** Zero or one member id (chips). */
	assignee: string[];
	dueDate: string;
	dueTime: string;
	notes: string;
	repeat: RepeatPreset;
	byDay: string[];
	interval: number;
	until: string;
}

const weekdayOf = (date: string): Weekday =>
	WEEKDAYS[Temporal.PlainDate.from(date).dayOfWeek - 1] as Weekday;

export function emptyTask(assignee: string | null, today: string): TaskFormValue {
	return {
		title: '',
		assignee: assignee ? [assignee] : [],
		dueDate: '',
		dueTime: '',
		notes: '',
		repeat: 'none',
		byDay: [weekdayOf(today)],
		interval: 1,
		until: '',
	};
}

export function taskFormFrom(source: TaskInput | Task, today: string): TaskFormValue {
	const recurrence = source.recurrence ?? null;
	const custom = 'rrule' in source && source.rrule !== null;
	return {
		title: source.title,
		assignee: source.assigneeId ? [source.assigneeId] : [],
		dueDate: source.dueDate ?? '',
		dueTime: source.dueTime ?? '',
		notes: source.notes ?? '',
		repeat: custom ? 'custom' : (recurrence?.freq ?? 'none'),
		byDay:
			recurrence?.freq === 'weekly' ? [...recurrence.byDay] : [weekdayOf(source.dueDate ?? today)],
		interval: recurrence?.interval ?? 1,
		until: recurrence?.until ?? '',
	};
}

export function taskInputFrom(v: TaskFormValue): TaskInput {
	const text = (s: string) => s.trim() || null;
	const until = text(v.until);
	const recurrence =
		v.repeat === 'daily' || v.repeat === 'monthly'
			? { freq: v.repeat, interval: v.interval, ...(until && { until }) }
			: v.repeat === 'weekly'
				? {
						freq: 'weekly' as const,
						interval: v.interval,
						byDay: v.byDay as Weekday[],
						...(until && { until }),
					}
				: null;
	const dueDate = text(v.dueDate);
	return {
		title: v.title,
		assigneeId: v.assignee[0] ?? null,
		dueDate,
		dueTime: dueDate ? text(v.dueTime) : null,
		notes: text(v.notes),
		recurrence,
	};
}

/** Field errors keyed by input path, from the contract's own schema. */
export function validateTask(v: TaskFormValue): Record<string, true> {
	const errors: Record<string, true> = {};
	if (v.repeat === 'custom' || (v.repeat === 'weekly' && v.byDay.length === 0))
		errors.recurrence = true;
	if (v.until && v.dueDate && v.until < v.dueDate) errors.until = true;
	const result = TaskInputSchema.safeParse(taskInputFrom(v));
	if (!result.success)
		for (const issue of result.error.issues) errors[String(issue.path[0] ?? 'form')] = true;
	return errors;
}
