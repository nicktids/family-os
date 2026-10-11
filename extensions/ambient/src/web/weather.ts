import {
	Cloud,
	CloudDrizzle,
	CloudFog,
	CloudLightning,
	CloudMoon,
	CloudRain,
	CloudSnow,
	CloudSun,
	Moon,
	Sun,
} from '@lucide/svelte';
import type { Component } from 'svelte';

export type WeatherLabel =
	| 'wmo_clear'
	| 'wmo_mostly_clear'
	| 'wmo_partly_cloudy'
	| 'wmo_cloudy'
	| 'wmo_fog'
	| 'wmo_drizzle'
	| 'wmo_rain'
	| 'wmo_snow'
	| 'wmo_showers'
	| 'wmo_thunderstorm'
	| 'wmo_unknown';

/** WMO weather interpretation codes (Open-Meteo) as an icon and a message key. */
export function describeWeather(
	code: number,
	isDay = true,
): { icon: Component; label: WeatherLabel } {
	if (code === 0) return { icon: isDay ? Sun : Moon, label: 'wmo_clear' };
	if (code === 1) return { icon: isDay ? Sun : Moon, label: 'wmo_mostly_clear' };
	if (code === 2) return { icon: isDay ? CloudSun : CloudMoon, label: 'wmo_partly_cloudy' };
	if (code === 3) return { icon: Cloud, label: 'wmo_cloudy' };
	if (code === 45 || code === 48) return { icon: CloudFog, label: 'wmo_fog' };
	if (code >= 51 && code <= 57) return { icon: CloudDrizzle, label: 'wmo_drizzle' };
	if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82))
		return { icon: CloudRain, label: code >= 80 ? 'wmo_showers' : 'wmo_rain' };
	if ((code >= 71 && code <= 77) || code === 85 || code === 86)
		return { icon: CloudSnow, label: 'wmo_snow' };
	if (code >= 95 && code <= 99) return { icon: CloudLightning, label: 'wmo_thunderstorm' };
	return { icon: Cloud, label: 'wmo_unknown' };
}
