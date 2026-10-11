import type { Logger } from '@famos/sdk';

const LEVELS = { debug: 20, info: 30, warn: 40, error: 50 } as const;
type LevelName = keyof typeof LEVELS;

/** Values under these keys are replaced at any depth, whatever object they sit in. */
const SECRET_KEYS = new Set(['password', 'pin', 'apikey', 'token', 'cookie', 'authorization']);

function scrub(value: unknown, seen: WeakSet<object>): unknown {
	if (value === null || typeof value !== 'object' || value instanceof Error) return value;
	if (seen.has(value)) return '[Circular]';
	seen.add(value);
	if (Array.isArray(value)) return value.map((v) => scrub(v, seen));
	const out: Record<string, unknown> = {};
	for (const [key, child] of Object.entries(value))
		out[key] = SECRET_KEYS.has(key.toLowerCase()) ? '[Redacted]' : scrub(child, seen);
	return out;
}

function serializeError(e: Error): Record<string, unknown> {
	return { type: e.constructor.name, message: e.message, stack: e.stack };
}

export interface LineLoggerOptions {
	level?: string;
	/** Where lines go; stdout by default. */
	write?: (line: string) => void;
	now?: () => number;
}

/** JSON lines in pino's shape (`level` number, `time` epoch ms, `msg`, merged fields). */
export function createLineLogger(options: LineLoggerOptions = {}): Logger {
	const threshold = LEVELS[(options.level ?? 'info') as LevelName] ?? LEVELS.info;
	const write = options.write ?? ((line) => void process.stdout.write(line));
	const now = options.now ?? Date.now;

	const make = (bindings: object): Logger => {
		const emit = (level: LevelName) => (obj: object, msg?: string) => {
			if (LEVELS[level] < threshold) return;
			const fields = scrub({ ...bindings, ...obj }, new WeakSet()) as Record<string, unknown>;
			if (fields.err instanceof Error) fields.err = serializeError(fields.err);
			const record = { level: LEVELS[level], time: now(), ...fields, ...(msg ? { msg } : {}) };
			let line: string;
			try {
				line = JSON.stringify(record);
			} catch {
				line = JSON.stringify({
					level: LEVELS[level],
					time: record.time,
					msg,
					unserializable: true,
				});
			}
			write(`${line}\n`);
		};
		return {
			debug: emit('debug'),
			info: emit('info'),
			warn: emit('warn'),
			error: emit('error'),
			child: (more) => make({ ...bindings, ...more }),
		};
	};
	return make({});
}
