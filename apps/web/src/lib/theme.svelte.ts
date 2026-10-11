/**
 * Day and night: each device chooses to follow the system, or to stay
 * in the day or the night palette of the active theme. Night is the `.dark` class on <html>.
 * The choice lives in this browser only (`famos.mode`); app.html applies it before first paint.
 */
export type Mode = 'system' | 'day' | 'night';
const KEY = 'famos.mode';

function stored(): Mode {
	try {
		const value = localStorage.getItem(KEY);
		return value === 'day' || value === 'night' ? value : 'system';
	} catch {
		return 'system';
	}
}

class DayNight {
	mode = $state<Mode>(typeof localStorage === 'undefined' ? 'system' : stored());

	set(mode: Mode): void {
		this.mode = mode;
		try {
			if (mode === 'system') localStorage.removeItem(KEY);
			else localStorage.setItem(KEY, mode);
		} catch {
			// private mode: the choice lasts until the page is closed
		}
	}
}

export const dayNight = new DayNight();

/** Keeps `.dark` on <html> in line with the device's choice and, for "system", the OS setting. */
export function followDayNight(): () => void {
	const query = matchMedia('(prefers-color-scheme: dark)');
	const apply = () => {
		const mode = dayNight.mode;
		const night = mode === 'night' || (mode === 'system' && query.matches);
		document.documentElement.classList.toggle('dark', night);
	};
	apply();
	query.addEventListener('change', apply);
	return () => query.removeEventListener('change', apply);
}
