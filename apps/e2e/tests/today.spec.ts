import { api, expect, setUpAndSignIn, test } from '../support/fixtures.ts';
import { day } from '../support/today.ts';

test('Today opens in each style with the day on it', async ({ page }) => {
	await setUpAndSignIn(page);
	await api(page, 'POST', '/api/v1/actions/calendar.createEvent', {
		title: 'School trip',
		allDay: true,
		date: day(0),
	});
	await api(page, 'POST', '/api/v1/actions/board.postNote', {
		text: 'Wi-Fi password is on the fridge',
		paper: 'note-1',
	});

	for (const style of ['broadsheet', 'lanes', 'wall']) {
		await api(page, 'POST', '/api/v1/actions/core.setFamilyStyle', { style });
		await page.goto('/');
		const body = page.getByTestId('today-body');
		await expect(body).toHaveAttribute('data-layout', style);
		await expect(body).toHaveAttribute('data-settled', 'true');
		await expect(page.getByTestId('day-sentence'), style).toBeVisible();
		await expect(body.getByText('School trip').first(), style).toBeVisible();
		await expect(body.getByText('Wi-Fi password is on the fridge').first(), style).toBeVisible();
	}
});

test('a block hidden from its ⋯ menu stays hidden, and comes back from Appearance', async ({
	page,
}) => {
	await setUpAndSignIn(page);
	await page.setViewportSize({ width: 1440, height: 900 });
	await api(page, 'POST', '/api/v1/actions/board.postNote', {
		text: 'Wi-Fi password is on the fridge',
		paper: 'note-1',
	});
	await page.goto('/');
	const note = page.getByTestId('today-body').getByText('Wi-Fi password is on the fridge');
	await expect(note).toBeVisible();

	await page.getByRole('button', { name: 'Options for The board' }).click();
	await page.getByRole('menuitem', { name: 'Hide from Today' }).click();
	await expect(note).toHaveCount(0);
	await expect(page.getByText('The board is hidden from Today')).toBeVisible();

	await page.reload();
	await expect(page.getByTestId('today-body')).toHaveAttribute('data-settled', 'true');
	await expect(note).toHaveCount(0);

	await page.goto('/settings/appearance');
	await page.locator('label[for="my-blocks-board.today"]').click();
	await expect
		.poll(
			async () => (await api<{ hidden: string[] }>(page, 'GET', '/api/v1/core/appearance')).hidden,
		)
		.toEqual([]);
	await page.goto('/');
	await expect(note).toBeVisible();
});
