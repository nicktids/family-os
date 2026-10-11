import type { Clock, IdGenerator, Logger } from '@famos/sdk';
import { createLineLogger } from './logger.ts';
import { createUuidv7 } from './uuidv7.ts';

export { createLineLogger } from './logger.ts';
export { createUuidv7 } from './uuidv7.ts';

export const systemClock: Clock = { now: () => Date.now() };

const uuidv7 = createUuidv7();

export const uuidv7Ids: IdGenerator = {
	next: (prefix) => `${prefix}_${uuidv7()}`,
};

export interface LoggerOptions {
	level?: string;
	pretty?: boolean;
}

/** Structured JSON logs on stdout. Secrets and family content must never be logged. */
export function createLogger(options: LoggerOptions = {}): Logger {
	return createLineLogger({ level: options.level });
}

/** A logger that discards everything, for tests. */
export const silentLogger: Logger = {
	debug: () => {},
	info: () => {},
	warn: () => {},
	error: () => {},
	child: () => silentLogger,
};
