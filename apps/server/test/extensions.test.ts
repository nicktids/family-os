import { describe, expect, it } from 'vitest';
import { extensions } from '../src/extensions.ts';

describe('bundled extensions', () => {
	// AGENTS.md rule 8: what the AI may propose can be taken back after it was approved.
	it('declare undo for every data-changing action the AI may propose', () => {
		const missing = extensions.flatMap((ext) =>
			ext.actions.filter((a) => a.ai && !a.readOnly && !a.external && !a.undo).map((a) => a.id),
		);
		expect(missing).toEqual([]);
	});
});
