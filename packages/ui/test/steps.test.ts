import { afterEach, describe, expect, it, vi } from 'vitest';
import { stepState } from '../src/famos/index.js';
import StepsFixture from './fixtures/StepsFixture.svelte';
import { cleanup, click, q, qa, render } from './helpers.js';

afterEach(cleanup);

const states = () => qa('li.step').map((li) => li.dataset.state);

describe('Steps', () => {
	it('places a step against the open one', () => {
		expect([1, 2, 3].map((n) => stepState(n, 2))).toEqual(['done', 'current', 'next']);
		expect(stepState(3, 4)).toBe('done');
	});

	it('opens the current step, folds the others to one line and ticks the done ones', () => {
		const el = render(StepsFixture, { current: 2 });
		expect(q('ol', el).getAttribute('aria-label')).toBe('Add a screen');
		expect(states()).toEqual(['done', 'current', 'next']);
		const [first, second, third] = qa('li.step');
		// Done: a tick instead of the number, its one line, "done" for screen readers.
		expect(first?.querySelector('.marker svg')).not.toBeNull();
		expect(first?.querySelector('.summary')?.textContent).toBe('example.org/display');
		expect(first?.querySelector('.sr-only')?.textContent).toBe(', done');
		expect(first?.querySelector('.body')).toBeNull();
		// Current: its number, its body, marked as the step.
		expect(second?.getAttribute('aria-current')).toBe('step');
		expect(second?.querySelector('.marker')?.textContent?.trim()).toBe('2');
		expect(second?.querySelector('.body input')).not.toBeNull();
		expect(second?.querySelector('.summary')).toBeNull();
		// Still to come: its number and title only.
		expect(third?.querySelector('.marker')?.textContent?.trim()).toBe('3');
		expect(third?.querySelector('.body')).toBeNull();
		expect(third?.textContent).not.toContain('All set.');
	});

	it('ticks every step when the flow is past the last one', () => {
		render(StepsFixture, { current: 4 });
		expect(states()).toEqual(['done', 'done', 'done']);
		expect(qa('li.step .body')).toHaveLength(0);
	});

	it('opens a done step again only when the page allows it', () => {
		render(StepsFixture, { current: 3 });
		expect(qa('li.step button.head')).toHaveLength(0);
		cleanup();
		const onselect = vi.fn();
		render(StepsFixture, { current: 3, onselect });
		const heads = qa('li.step button.head');
		// Only the done steps (1 and 2) are buttons; the open one is not.
		expect(heads).toHaveLength(2);
		click(heads[1] as HTMLElement);
		expect(onselect).toHaveBeenCalledWith(2);
	});
});
