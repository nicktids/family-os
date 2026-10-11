import type { InProcessEventBus } from '@famos/core';
import type { Logger } from '@famos/sdk';
import type { WSContext } from 'hono/ws';

/**
 * Pushes `{ type: 'event', name, payload }` to every connected, signed-in client after commit.
 * Payloads carry IDs only; clients refetch what they need.
 */
export function createRealtimeHub(bus: InProcessEventBus, logger: Logger) {
	/**
	 * Every open socket; a display's socket also remembers which device it belongs to, and a
	 * member's which member (events addressed to a member go to those sockets only).
	 */
	const clients = new Map<WSContext, { deviceId: string | null; memberId: string | null }>();
	// Private events (assistant answers): the owner's sockets only, never displays or others.
	bus.onMember((memberId, name, payload) => {
		const message = JSON.stringify({ type: 'event', name, payload });
		for (const [ws, who] of clients) {
			if (who.memberId !== memberId) continue;
			try {
				ws.send(message);
			} catch (error) {
				logger.debug({ err: error }, 'dropping websocket client');
				clients.delete(ws);
			}
		}
	});
	bus.onAny((name, payload) => {
		const message = JSON.stringify({ type: 'event', name, payload });
		for (const ws of clients.keys()) {
			try {
				ws.send(message);
			} catch (error) {
				logger.debug({ err: error }, 'dropping websocket client');
				clients.delete(ws);
			}
		}
		// A display was revoked or changed: end its socket now. The display reconnects
		// and is checked again, so a revoked one is refused and a changed one gets its new rights.
		const deviceId =
			name === 'core.device.changed' ? (payload as { deviceId?: string }).deviceId : null;
		if (!deviceId) return;
		for (const [ws, who] of clients) {
			if (who.deviceId !== deviceId) continue;
			clients.delete(ws);
			try {
				ws.close(4401, 'device_changed');
			} catch (error) {
				logger.debug({ err: error }, 'closing websocket failed');
			}
		}
	});
	return {
		/**
		 * `deviceId`: the display this socket belongs to, if it is a display's; `memberId`: the
		 * signed-in member, if it is one's (a display holds no member and receives no private event).
		 */
		events: (deviceId: string | null = null, memberId: string | null = null) => ({
			onOpen: (_event: unknown, ws: WSContext) => {
				clients.set(ws, { deviceId, memberId });
				ws.send(JSON.stringify({ type: 'hello' }));
			},
			onClose: (_event: unknown, ws: WSContext) => {
				clients.delete(ws);
			},
		}),
		size: () => clients.size,
	};
}
