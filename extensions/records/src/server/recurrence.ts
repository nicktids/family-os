import { everyFromRule, everyToRule, nextEveryDue } from '@famos/time';
import type { Every } from '../contract/index.ts';

/**
 * Repeats of an obligation: every N months or years from the first due date (the anchor), stored
 * as an RFC 5545 rule and expanded by `@famos/time` so that "the 31st" falls on the last day of a
 * short month.
 */
export const toRule = (every: Every): string => everyToRule(every);

export const fromRule = (rule: string | null): Every | null => everyFromRule(rule);

/** The first occurrence strictly after `after`, counting from `anchor`. */
export const nextDue = (anchor: string, every: Every, after: string): string =>
	nextEveryDue(anchor, every, after);
