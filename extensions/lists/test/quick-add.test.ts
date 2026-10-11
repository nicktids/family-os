import { repoTranslate } from '@famos/testing';
import { describe, expect, it } from 'vitest';
import { parseQuickAdd } from '../src/web/quick-add.ts';

/** The units of the English catalog and of the bundled Turkish pack, as the page reads them. */
const translate = repoTranslate();
const units = (locale: string) => translate(locale, 'lists:quantity_units').split(',');
const en = units('en');
const tr = units('tr');

describe('parseQuickAdd', () => {
	it('splits items and takes a leading amount as the quantity', () => {
		expect(parseQuickAdd('2 kg domates, ekmek;  1,5 L süt\n3 yumurta', tr)).toEqual([
			{ title: 'domates', quantity: '2 kg' },
			{ title: 'ekmek' },
			{ title: 'süt', quantity: '1,5 L' },
			{ title: 'yumurta', quantity: '3' },
		]);
	});

	it('reads imperial and US units as quantities', () => {
		expect(
			parseQuickAdd(
				'2 lb flour, 1 gal milk; 12 oz cheese\n1 dozen eggs, 3 cans tomatoes, 2 bottles water, 1 pack bacon, 6 pcs rolls',
				en,
			),
		).toEqual([
			{ title: 'flour', quantity: '2 lb' },
			{ title: 'milk', quantity: '1 gal' },
			{ title: 'cheese', quantity: '12 oz' },
			{ title: 'eggs', quantity: '1 dozen' },
			{ title: 'tomatoes', quantity: '3 cans' },
			{ title: 'water', quantity: '2 bottles' },
			{ title: 'bacon', quantity: '1 pack' },
			{ title: 'rolls', quantity: '6 pcs' },
		]);
		expect(parseQuickAdd('2 lbs. rice, 1 qt cream, 2 pt berries, 1 doz rolls', en)).toEqual([
			{ title: 'rice', quantity: '2 lbs.' },
			{ title: 'cream', quantity: '1 qt' },
			{ title: 'berries', quantity: '2 pt' },
			{ title: 'rolls', quantity: '1 doz' },
		]);
	});

	it('keeps numbers that are part of the name', () => {
		expect(parseQuickAdd('7up', en)).toEqual([{ title: '7up' }]);
		expect(parseQuickAdd(' , ,', en)).toEqual([]);
	});
});
