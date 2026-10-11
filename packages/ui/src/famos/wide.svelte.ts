import { MediaQuery } from 'svelte/reactivity';

/**
 * True on windows 1024 px wide and more. The width decides,
 * never the device. Read it in a template or an effect: `wide.current`.
 */
export const wide = new MediaQuery('min-width: 1024px', false);
