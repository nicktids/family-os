import type { EventBus, EventDefinition, EventPayload, Logger, Unsubscribe } from '@famos/sdk';

type Handler = (payload: unknown) => void | Promise<void>;
type AnyHandler = (name: string, payload: unknown) => void | Promise<void>;

export interface InProcessEventBus extends EventBus {
	/** Publishes after commit. Handler failures are logged, never propagated to the publisher. */
	publish(name: string, payload: unknown): Promise<void>;
	/**
	 * Publishes to one member (private content such as assistant answers). Only subscribers of
	 * `onMember` (the realtime hub) see it: not `on`, not `onAny`, and nothing is stored.
	 */
	publishTo(memberId: string, name: string, payload: unknown): Promise<void>;
	/** Events addressed to a member, for the transport that delivers them to that member only. */
	onMember(
		handler: (memberId: string, name: string, payload: unknown) => void | Promise<void>,
	): Unsubscribe;
}

export function createEventBus(logger: Logger): InProcessEventBus {
	const handlers = new Map<string, Set<Handler>>();
	const anyHandlers = new Set<AnyHandler>();
	const memberHandlers = new Set<
		(memberId: string, name: string, payload: unknown) => void | Promise<void>
	>();

	const safely = async (fn: () => void | Promise<void>, event: string) => {
		try {
			await fn();
		} catch (error) {
			logger.error({ err: error, event }, 'event handler failed');
		}
	};

	async function publish(name: string, payload: unknown) {
		const targets = [...(handlers.get(name) ?? [])];
		await Promise.all([
			...targets.map((h) => safely(() => h(payload), name)),
			...[...anyHandlers].map((h) => safely(() => h(name, payload), name)),
		]);
	}

	async function publishTo(memberId: string, name: string, payload: unknown) {
		await Promise.all(
			[...memberHandlers].map((h) => safely(() => h(memberId, name, payload), name)),
		);
	}

	return {
		on<E extends EventDefinition>(
			event: E,
			handler: (payload: EventPayload<E>) => void | Promise<void>,
		): Unsubscribe {
			const set = handlers.get(event.name) ?? new Set();
			handlers.set(event.name, set);
			const h = handler as Handler;
			set.add(h);
			return () => set.delete(h);
		},
		onAny(handler: AnyHandler): Unsubscribe {
			anyHandlers.add(handler);
			return () => anyHandlers.delete(handler);
		},
		publish,
		publishTo,
		onMember(handler) {
			memberHandlers.add(handler);
			return () => memberHandlers.delete(handler);
		},
		emitTo: (memberId, event, payload) =>
			publishTo(memberId, event.name, event.payload.parse(payload)),
		emit: (event, payload) => publish(event.name, event.payload.parse(payload)),
	};
}
