import { unwrap } from '@famos/api-client';
import { api } from './api';

export interface NotificationItem {
	id: string;
	title: string;
	body?: string | null | undefined;
	url?: string | null | undefined;
	read: boolean;
	createdAt: number;
}

/**
 * The signed-in member's notifications: the unread count (the bell) and the recent list (the
 * popover and `/notifications`). Refreshed on realtime events.
 */
class NotificationsState {
	unread = $state(0);
	items = $state<NotificationItem[]>([]);
	error = $state(false);

	async refresh(): Promise<void> {
		const res = await api.GET('/api/v1/core/notifications', { params: { query: { limit: 1 } } });
		if (res.data) this.unread = res.data.unread;
	}

	async load(limit = 50): Promise<void> {
		const res = await api.GET('/api/v1/core/notifications', { params: { query: { limit } } });
		if (res.data) {
			this.items = res.data.items as NotificationItem[];
			this.unread = res.data.unread;
		}
	}

	/** Marks the given notifications (all when none given) as read. */
	async markRead(ids?: string[], limit = 50): Promise<boolean> {
		try {
			unwrap(
				await api.POST('/api/v1/actions/core.markNotificationsRead', {
					body: ids ? { ids } : {},
				}),
			);
			this.error = false;
			await this.load(limit);
			return true;
		} catch {
			this.error = true;
			return false;
		}
	}
}

export const notifications = new NotificationsState();
