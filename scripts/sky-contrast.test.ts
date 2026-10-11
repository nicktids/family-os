import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio, parseColor, type Rgba } from '../packages/themes/src/color.ts';
import { listThemeDirsSync, readThemeDirSync } from '../packages/themes/src/node.ts';
import { type ThemeTokens, validateThemePack } from '../packages/themes/src/pack.ts';
import {
	paintCss,
	SKY_FOG_OPACITY,
	SKY_KINDS,
	SKY_SOFT_INK,
	type SkyCondition,
	type SkyPaint,
	skyClouds,
	skyWash,
} from '../packages/ui/src/famos/sky.ts';

/**
 * The weather sky (packages/ui/src/famos/WeatherSky.svelte) sits behind the temperature, the
 * sentence and the hourly strip. Its wash is `color-mix(in srgb, …)` of theme tokens and its
 * clouds and fog are `sky-cloud` (sky.ts), so this computes the same colours for every bundled
 * pack, light and dark, for every sky by day and by night, and checks that `ink` and the sky's
 * soft ink keep 4.5:1 on the top and the bottom of the wash, on a cloud and on a fog bank.
 */
const root = join(import.meta.dirname, '..');
const MIN = 4.5;

const defaults = (): ThemeTokens => {
	const result = validateThemePack(readThemeDirSync(join(root, 'themes', 'ev-isigi')));
	if (!result.ok) throw new Error(result.errors.join('; '));
	return result.pack.tokens;
};

/** CSS `color-mix(in srgb, a share%, b)` of opaque colours: a straight mix of the channels. */
const mix = (a: Rgba, b: Rgba, share: number): Rgba => ({
	r: a.r * share + b.r * (1 - share),
	g: a.g * share + b.g * (1 - share),
	b: a.b * share + b.b * (1 - share),
	a: 1,
});

describe('text on the weather sky', () => {
	it('keeps 4.5:1 in every bundled pack, light and dark, every sky by day and by night', () => {
		const fallback = defaults();
		const problems: string[] = [];
		for (const name of listThemeDirsSync(join(root, 'themes'))) {
			const result = validateThemePack(readThemeDirSync(join(root, 'themes', name)), {
				fallback,
				appVersion: '0.1.0',
			});
			if (!result.ok) throw new Error(result.errors.join('; '));
			for (const mode of ['day', 'night'] as const) {
				const tokens = result.pack.tokens[mode] as Record<string, string>;
				const token = (t: string) => parseColor(tokens[t] as string) as Rgba;
				const painted = ({ ground, mix: shares }: SkyPaint): Rgba => {
					let color = token(ground);
					// Same as the nested color-mix: the first share is mixed last.
					let left = 100;
					const steps = shares.map(([t, s]) => {
						const step = { t, share: s / left };
						left -= s;
						return step;
					});
					for (const { t, share } of steps.toReversed()) color = mix(token(t), color, share);
					return color;
				};
				/** `sky-cloud` (it may be transparent) drawn over `under` at `strength`. */
				const cloudOver = (under: Rgba, strength: number) => {
					const cloud = token('sky-cloud');
					return mix(cloud, under, cloud.a * strength);
				};
				for (const kind of SKY_KINDS) {
					for (const night of [false, true]) {
						const condition: SkyCondition = { kind, night };
						const wash = skyWash(condition);
						const top = painted(wash.top);
						const bottom = painted(wash.bottom);
						const grounds: [string, Rgba][] = [
							['the top of the wash', top],
							['the bottom of the wash', bottom],
						];
						const clouds = skyClouds(condition);
						if (clouds.count > 0) {
							grounds.push(['a cloud at the top', cloudOver(top, clouds.opacity)]);
							grounds.push(['a cloud at the bottom', cloudOver(bottom, clouds.opacity)]);
						}
						if (kind === 'fog') {
							grounds.push(['a fog bank', cloudOver(bottom, SKY_FOG_OPACITY)]);
							grounds.push(['a fog bank at the top', cloudOver(top, SKY_FOG_OPACITY)]);
						}
						const texts: [string, Rgba][] = [
							['ink', token('ink')],
							['soft ink', mix(token('ink-soft'), token('ink'), SKY_SOFT_INK / 100)],
						];
						for (const [text, color] of texts) {
							for (const [where, background] of grounds) {
								const ratio = contrastRatio(color, background);
								if (ratio < MIN)
									problems.push(
										`${name} ${mode}: ${text} on ${where} of ${kind}${night ? ' at night' : ''} is ${ratio.toFixed(2)}:1`,
									);
							}
						}
					}
				}
			}
		}
		expect(problems).toEqual([]);
	});

	it('writes the same mixes as CSS', () => {
		expect(paintCss({ ground: 'surface', mix: [] })).toBe('var(--surface)');
		expect(paintCss({ ground: 'surface', mix: [['info', 20]] })).toBe(
			'color-mix(in srgb, var(--info) 20%, var(--surface))',
		);
		expect(
			paintCss({
				ground: 'wall',
				mix: [
					['info', 20],
					['backdrop', 40],
				],
			}),
		).toBe(
			'color-mix(in srgb, var(--info) 20%, color-mix(in srgb, var(--backdrop) 50%, var(--wall)))',
		);
	});
});
