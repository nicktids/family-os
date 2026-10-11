/**
 * App-wide notices ("Added to calendar · Undo"). One at a time; a new one replaces the old.
 * Messages auto-dismiss; the action stays available until then.
 */
interface Notice {
	id: number;
	message: string;
	actionLabel?: string;
	onaction?: () => void;
}

class Toasts {
	current = $state<Notice | null>(null);
	#timer: ReturnType<typeof setTimeout> | undefined;
	#seq = 0;

	show(message: string, action?: { label: string; run: () => void }, durationMs = 5000) {
		clearTimeout(this.#timer);
		const id = ++this.#seq;
		this.current = {
			id,
			message,
			...(action && {
				actionLabel: action.label,
				onaction: () => {
					this.dismiss();
					action.run();
				},
			}),
		};
		this.#timer = setTimeout(() => {
			if (this.current?.id === id) this.current = null;
		}, durationMs);
	}

	dismiss() {
		clearTimeout(this.#timer);
		this.current = null;
	}
}

export const toasts = new Toasts();
