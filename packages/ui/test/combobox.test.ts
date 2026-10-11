import { flushSync } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { Combobox } from '../src/famos/index.js';
import { cleanup, qa, render } from './helpers.js';

afterEach(cleanup);

// A long list where many names contain "tr" before the one that starts with it.
const options = [
	{ value: 'AUD', label: 'Australian dollar' },
	{ value: 'ATS', label: 'Austrian schilling' },
	{ value: 'INR', label: 'Indian rupee' },
	{ value: 'STD', label: 'São Tomé dobra' },
	{ value: 'TRY', label: 'Turkish lira' },
	{ value: 'USD', label: 'US dollar' },
];

function type(text: string): void {
	const input = document.querySelector('input') as HTMLInputElement;
	input.focus();
	input.value = text;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}
const listed = () => qa('[role="option"]').map((o) => o.textContent?.replace(/\s+/g, ' ').trim());

describe('Combobox', () => {
	it('finds an option by its code typed in full and keeps it listed with its name', () => {
		render(Combobox, { id: 'c', options });
		type('TRY');
		expect(listed()[0]).toBe('TRY Turkish lira');
		expect(document.querySelector('input')?.getAttribute('aria-activedescendant')).toBe('c-opt-0');
	});

	it('ranks a code that starts with the text before names that only contain it', () => {
		render(Combobox, { id: 'c', options, max: 2 });
		type('tr');
		expect(listed()[0]).toBe('TRY Turkish lira');
	});

	it('finds an option by the start of a word in its name, in any case', () => {
		render(Combobox, { id: 'c', options });
		type('LIRA');
		expect(listed()).toEqual(['TRY Turkish lira']);
	});

	it('matches without depending on the language of the browser', () => {
		render(Combobox, { id: 'c', options });
		type('inr');
		expect(listed()[0]).toBe('INR Indian rupee');
	});
});
