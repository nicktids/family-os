import { describe, expect, it } from 'vitest';
import { firstName, shortName, withShortNames } from '../src/famos/short-names.js';

describe('shortName', () => {
	it('is the first word of the name', () => {
		expect(shortName('Sofia Brandt')).toBe('Sofia');
		expect(shortName('  Lukas   Brandt ')).toBe('Lukas');
		expect(shortName('Elif Brandt-Okafor')).toBe('Elif');
	});

	it('keeps a one-word name whole', () => {
		expect(shortName('Ellie')).toBe('Ellie');
		expect(shortName('Mary-Jane')).toBe('Mary-Jane');
	});
});

describe('withShortNames', () => {
	it('gives every member their first word', () => {
		const out = withShortNames([
			{ id: 'a', displayName: 'Sofia Brandt' },
			{ id: 'b', displayName: 'Lukas Brandt' },
			{ id: 'c', displayName: 'Ellie' },
			{ id: 'd', displayName: 'Noah' },
		]);
		expect(out.map((m) => m.shortName)).toEqual(['Sofia', 'Lukas', 'Ellie', 'Noah']);
		expect(out[0]).toMatchObject({ id: 'a', displayName: 'Sofia Brandt' });
	});

	it('keeps whole names when two people share a first word', () => {
		const out = withShortNames([
			{ displayName: 'Anna Berg' },
			{ displayName: 'anna Lind' },
			{ displayName: 'Tom Berg' },
		]);
		expect(out.map((m) => m.shortName)).toEqual(['Anna Berg', 'anna Lind', 'Tom']);
	});
});

describe('firstName', () => {
	const family = [
		{ id: 'a', displayName: 'Sofia Brandt' },
		{ id: 'b', displayName: 'Sofia Lind' },
		{ id: 'c', displayName: 'Noah Brandt' },
	];

	it('is the short name among the family', () => {
		expect(firstName(family, family[2])).toBe('Noah');
		expect(firstName(family, family[0])).toBe('Sofia Brandt');
	});

	it('is the first word before the family is known, and empty without a person', () => {
		expect(firstName([], { id: 'x', displayName: 'Deniz Kaya' })).toBe('Deniz');
		expect(firstName(family, null)).toBe('');
	});
});
