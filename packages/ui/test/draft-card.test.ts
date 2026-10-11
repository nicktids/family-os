import { afterEach, describe, expect, it, vi } from 'vitest';
import { DraftCard } from '../src/famos/index.js';
import { cleanup, qa, render } from './helpers.js';

afterEach(cleanup);

const labels = {
	approve: 'Approve',
	edit: 'Edit',
	save: 'Save',
	cancel: 'Cancel',
	reject: 'Reject',
	rejectConfirm: 'Tap again',
	checkThis: 'Check this',
	applied: 'Added',
	rejected: 'Rejected',
	retry: 'Try again',
	expired: 'Its day has passed',
};
const card = (status: string, compact = false) =>
	render(DraftCard, {
		kind: 'Meal',
		title: 'Lentil soup',
		fields: [{ label: 'When', value: 'Saturday · Dinner' }],
		status,
		labels,
		compact,
		onapprove: vi.fn(),
		onreject: vi.fn(),
	});

describe('DraftCard', () => {
	it('shows an expired suggestion as settled: its day has passed, and no buttons', () => {
		for (const compact of [false, true]) {
			const el = card('expired', compact);
			expect(el.querySelector('[role="status"]')?.textContent?.trim()).toBe('Its day has passed');
			expect(qa('button', el)).toHaveLength(0);
			cleanup();
		}
	});
});
