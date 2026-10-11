import type { z } from 'zod';

/**
 * In-process events, emitted only after the surrounding transaction commits. Payloads carry IDs,
 * not data. Use events for UI invalidation and non-critical reactions; anything that must
 * survive a crash goes through the job queue instead.
 */
export interface EventDefinition<
	Name extends string = string,
	Schema extends z.ZodType = z.ZodType,
> {
	readonly name: Name;
	readonly payload: Schema;
}

export function defineEvent<const Name extends string, Schema extends z.ZodType>(
	name: Name,
	payload: Schema,
): EventDefinition<Name, Schema> {
	return { name, payload };
}

export type EventPayload<E extends EventDefinition> = z.infer<E['payload']>;

export type Unsubscribe = () => void;

export interface EventBus {
	on<E extends EventDefinition>(
		event: E,
		handler: (payload: EventPayload<E>) => void | Promise<void>,
	): Unsubscribe;
	/** Every event, for transports such as the WebSocket broadcaster. */
	onAny(handler: (name: string, payload: unknown) => void | Promise<void>): Unsubscribe;
	/**
	 * Publishes outside a unit of work, for jobs whose writes are already committed. Inside an
	 * action use `uow.emit`, which publishes only if the transaction commits.
	 */
	emit<E extends EventDefinition>(event: E, payload: EventPayload<E>): Promise<void>;
	/**
	 * Publishes to one member only: the realtime transport delivers it to that member's own
	 * connections, never to other members or displays, and nothing is stored. For content that is
	 * private to a person (assistant answers); ordinary handlers and `onAny` never see it.
	 */
	emitTo<E extends EventDefinition>(
		memberId: string,
		event: E,
		payload: EventPayload<E>,
	): Promise<void>;
}

/** Collects events during a unit of work; they are published only if it commits. */
export interface EventEmitter {
	emit<E extends EventDefinition>(event: E, payload: EventPayload<E>): void;
}
