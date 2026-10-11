import { unwrap } from '@famos/api-client';
import { api } from './api';

export type PushSupport = 'ok' | 'ios-home-screen' | 'unsupported';

export interface PushDevice {
	label: string;
	createdAt: number;
	lastSuccessAt: number | null;
}

const isIos = () =>
	/iPad|iPhone|iPod/.test(navigator.userAgent) ||
	// iPadOS reports itself as a Mac with a touch screen.
	(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** "iPhone · Safari": a short device name from the user agent, shown in the device list. */
export function deviceLabel(ua = navigator.userAgent): string {
	const platform = /iPhone/.test(ua)
		? 'iPhone'
		: /iPad/.test(ua)
			? 'iPad'
			: /Android/.test(ua)
				? 'Android'
				: /Windows/.test(ua)
					? 'Windows'
					: /Mac OS X|Macintosh/.test(ua)
						? 'Mac'
						: /Linux|X11/.test(ua)
							? 'Linux'
							: '';
	const browser = /Edg\//.test(ua)
		? 'Edge'
		: /OPR\/|Opera/.test(ua)
			? 'Opera'
			: /Firefox\/|FxiOS/.test(ua)
				? 'Firefox'
				: /Chrome\/|CriOS/.test(ua)
					? 'Chrome'
					: /Safari\//.test(ua)
						? 'Safari'
						: '';
	return [platform, browser].filter(Boolean).join(' · ');
}

const toBytes = (b64url: string): Uint8Array<ArrayBuffer> => {
	const padded = b64url.replace(/-/g, '+').replace(/_/g, '/');
	const raw = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
	return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

/** The service worker, or a failure when none is registered (for example in development). */
function readyRegistration(): Promise<ServiceWorkerRegistration> {
	return Promise.race([
		navigator.serviceWorker.ready,
		new Promise<never>((_, reject) =>
			setTimeout(() => reject(new Error('no service worker')), 5000),
		),
	]);
}

/** Web Push on this device: permission, browser subscription and the server's list. */
class PushState {
	support = $state<PushSupport>('ok');
	permission = $state<NotificationPermission>('default');
	/** This browser holds a subscription (and the server knows it after `enable`). */
	subscribed = $state(false);
	devices = $state<PushDevice[]>([]);
	busy = $state(false);

	/** Reads what the browser and the server know. Safe to call often. */
	async refresh(): Promise<void> {
		if (
			!('serviceWorker' in navigator) ||
			!('PushManager' in window) ||
			!('Notification' in window)
		) {
			this.support = isIos() ? 'ios-home-screen' : 'unsupported';
			return;
		}
		this.support = 'ok';
		this.permission = Notification.permission;
		try {
			const registration = await readyRegistration();
			this.subscribed = (await registration.pushManager.getSubscription()) !== null;
		} catch {
			this.subscribed = false;
		}
		const res = await api.GET('/api/v1/push/subscriptions');
		if (res.data) this.devices = res.data;
	}

	/**
	 * Must run inside a click handler: browsers (iOS above all) only ask for permission after a
	 * user gesture. Throws when permission is refused or the subscription fails.
	 */
	async enable(): Promise<void> {
		this.busy = true;
		try {
			const permission = await Notification.requestPermission();
			this.permission = permission;
			if (permission !== 'granted') throw new Error('permission');
			const { publicKey } = unwrap(await api.GET('/api/v1/push/key'));
			const registration = await readyRegistration();
			const subscription =
				(await registration.pushManager.getSubscription()) ??
				(await registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: toBytes(publicKey),
				}));
			const json = subscription.toJSON();
			const { p256dh, auth } = json.keys ?? {};
			if (!json.endpoint || !p256dh || !auth) throw new Error('incomplete subscription');
			unwrap(
				await api.POST('/api/v1/push/subscriptions', {
					body: { endpoint: json.endpoint, keys: { p256dh, auth }, label: deviceLabel() },
				}),
			);
			await this.refresh();
		} finally {
			this.busy = false;
		}
	}

	async disable(): Promise<void> {
		this.busy = true;
		try {
			const registration = await readyRegistration();
			const subscription = await registration.pushManager.getSubscription();
			if (subscription) {
				unwrap(
					await api.DELETE('/api/v1/push/subscriptions', {
						body: { endpoint: subscription.endpoint },
					}),
				);
				await subscription.unsubscribe();
			}
			await this.refresh();
		} finally {
			this.busy = false;
		}
	}

	/** Sends a test to all my devices; the number reached. */
	async sendTest(): Promise<number> {
		this.busy = true;
		try {
			return unwrap(await api.POST('/api/v1/push/test')).sent;
		} finally {
			this.busy = false;
		}
	}
}

export const push = new PushState();
