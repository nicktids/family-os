import type { StyleId } from '@famos/ui/styles';
import type { Component } from 'svelte';
import Broadsheet from './Broadsheet.svelte';
import type { CompositionProps } from './display-fit.js';
import Lanes from './Lanes.svelte';
import Wall from './Wall.svelte';

/**
 * Today's composition for each style, on Today and on a family display (family mode).
 * Every composition takes the same `TodayData` (loading and settling live there) and only
 * arranges it. A style without its own composition yet shows Broadsheet's.
 */
const COMPOSITIONS: Partial<Record<StyleId, Component<CompositionProps>>> = {
	broadsheet: Broadsheet,
	wall: Wall,
	lanes: Lanes,
};

export const compositionFor = (style: StyleId): Component<CompositionProps> =>
	COMPOSITIONS[style] ?? Broadsheet;
