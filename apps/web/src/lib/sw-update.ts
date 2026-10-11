/**
 * Pushes service-worker updates: kiosk tabs are never closed, so a waiting worker is told to
 * take over and the page reloads once.
 */
import { version } from '$app/env';

/** The app version the controlling worker serves, or undefined when it does not answer soon. */
function workerVersion(): Promise<string | undefined> {
	const worker = navigator.serviceWorker.controller;
	if (!worker) return Promise.resolve(undefined);
	return new Promise((resolve) => {
		const channel = new MessageChannel();
		const timer = setTimeout(() => resolve(undefined), 1000);
		channel.port1.onmessage = (event) => {
			clearTimeout(timer);
			resolve(typeof event.data === 'string' ? event.data : undefined);
		};
		worker.postMessage({ type: 'VERSION' }, [channel.port2]);
	});
}

export function enableServiceWorkerUpdates(): () => void {
	if (!('serviceWorker' in navigator)) return () => {};
	let reloading = false;
	// A page opened after a deployment already runs the new app (pages come from the network); the
	// new worker taking over then needs no reload. Only a page running an older app reloads, once.
	const reloadIfOlder = async () => {
		if (reloading) return;
		const served = await workerVersion();
		if (served === version || reloading) return;
		reloading = true;
		location.reload();
	};
	const onControllerChange = () => void reloadIfOlder();
	navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

	const activate = (worker: ServiceWorker | null | undefined) =>
		worker?.postMessage({ type: 'SKIP_WAITING' });
	void navigator.serviceWorker.getRegistration().then((reg) => {
		if (!reg) return;
		if (reg.waiting) activate(reg.waiting);
		reg.addEventListener('updatefound', () => {
			const worker = reg.installing;
			worker?.addEventListener('statechange', () => {
				if (worker.state === 'installed' && navigator.serviceWorker.controller) activate(worker);
			});
		});
	});

	const check = () => {
		void navigator.serviceWorker.getRegistration().then((reg) => reg?.update());
	};
	// Check for new deployments every 15 minutes (always-on kiosks), and whenever the person comes
	// back to the tab, so a tab left open across an update does not keep running the old app.
	const timer = setInterval(check, 15 * 60 * 1000);
	const onVisible = () => {
		if (document.visibilityState === 'visible') check();
	};
	document.addEventListener('visibilitychange', onVisible);

	return () => {
		clearInterval(timer);
		document.removeEventListener('visibilitychange', onVisible);
		navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
	};
}
