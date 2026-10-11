import { amountPattern, type ShoppingItemInput, splitAmount } from '../contract/index.js';

/**
 * Turns quick-add text into items: commas or new lines separate items, and a leading amount
 * becomes the quantity ("2 kg tomatoes, bread" → tomatoes (2 kg), bread). The units are words of
 * the language packs (`lists:quantity_units`), never of the code.
 */
export function parseQuickAdd(text: string, units: readonly string[]): ShoppingItemInput[] {
	const pattern = amountPattern(units);
	return text
		.split(/[\n;]|,(?!\d)/) // "1,5 kg" keeps its decimal comma
		.map((part) => part.trim())
		.filter(Boolean)
		.map((part) => splitAmount(part, pattern))
		.filter((item) => item.title.length > 0)
		.slice(0, 50);
}
