/**
 * Errors that cross the core/HTTP boundary. Inbound adapters map `code` to a transport status;
 * anything else is treated as an internal error and never leaks details to clients.
 */
export type FamosErrorCode =
	| 'bad_request'
	| 'unauthenticated'
	| 'forbidden'
	| 'not_found'
	| 'conflict'
	/** A quota or rate limit was reached; trying later may work. */
	| 'limit_reached'
	/** The extension is turned off (More → Features). */
	| 'feature_off'
	/** An `Idempotency-Key` was reused for a different action. */
	| 'idempotency_mismatch'
	| 'unavailable';

export class FamosError extends Error {
	readonly code: FamosErrorCode;
	readonly details: unknown;

	constructor(code: FamosErrorCode, message: string, details?: unknown) {
		super(message);
		this.name = 'FamosError';
		this.code = code;
		this.details = details;
	}
}

export const isFamosError = (error: unknown): error is FamosError => error instanceof FamosError;

/** The HTTP status each error code maps to (shared by the API and the stored idempotent results). */
export const ERROR_HTTP_STATUS: Record<FamosErrorCode, number> = {
	bad_request: 400,
	unauthenticated: 401,
	forbidden: 403,
	not_found: 404,
	conflict: 409,
	limit_reached: 429,
	feature_off: 404,
	idempotency_mismatch: 422,
	unavailable: 503,
};
