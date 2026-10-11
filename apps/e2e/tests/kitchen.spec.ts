import { expect, setUpAndSignIn, test } from '../support/fixtures.ts';

test('a recipe typed in is planned for dinner, and two ingredients reach the shopping list', async ({
	page,
}) => {
	await setUpAndSignIn(page);
	await page.goto('/kitchen');
	await expect(page.getByRole('heading', { name: 'Kitchen', exact: true })).toBeVisible();
	await expect(page.getByText('No recipes yet.')).toBeVisible();

	// Type a recipe in; an admin's recipe is saved straight away.
	await page.getByRole('button', { name: 'Add recipe' }).click();
	await page.getByLabel('Name', { exact: true }).fill('Lentil soup');
	await page.getByLabel('Servings', { exact: true }).fill('4');
	await page
		.getByLabel('Ingredients', { exact: true })
		.fill('1 cup red lentils\n1 onion\n2 carrots');
	await page
		.getByLabel('Steps', { exact: true })
		.fill('Chop the onion and carrots.\nSimmer everything for 30 minutes.');
	await page.getByRole('button', { name: 'Save', exact: true }).click();

	await expect(page.getByRole('heading', { name: 'Lentil soup', exact: true })).toBeVisible();
	await expect(page.getByText('Simmer everything for 30 minutes.')).toBeVisible();

	// Put it on the meal plan from its page (today, dinner); the toast leads to the plan.
	await page.getByRole('button', { name: 'Put it on the meal plan', exact: true }).click();
	await page.getByTestId('side-panel').getByRole('button', { name: 'Add', exact: true }).click();
	await expect(page.getByText('Added to the meal plan')).toBeVisible();
	await page.getByRole('button', { name: 'See the plan' }).click();
	await expect(page).toHaveURL(/\/kitchen\/plan\?date=/);
	const planned = page.getByTestId('week-board').getByRole('link', { name: 'Lentil soup' });
	await expect(planned).toHaveCount(1);

	// From the recipe list, for lunch.
	await page.goto('/kitchen');
	await page.getByRole('button', { name: 'Put Lentil soup on the meal plan' }).click();
	await page
		.getByTestId('side-panel')
		.getByLabel('Meal', { exact: true })
		.selectOption({ label: 'Lunch' });
	await page.getByTestId('side-panel').getByRole('button', { name: 'Add', exact: true }).click();
	await expect(page.getByText('Added to the meal plan')).toBeVisible();

	// From an empty breakfast on the plan: the recipes come first.
	await page.goto('/kitchen/plan');
	await expect(planned).toHaveCount(2);
	await page
		.getByRole('button', { name: /^Plan a meal: Breakfast/ })
		.first()
		.click();
	await page.getByTestId('side-panel').getByLabel('Lentil soup', { exact: true }).check();
	await page.getByTestId('side-panel').getByRole('button', { name: 'Add', exact: true }).click();
	await expect(planned).toHaveCount(3);

	// Tick two ingredients and send them to the shopping list.
	await page.goto('/kitchen');
	await page.getByRole('link', { name: /Lentil soup/ }).click();
	await page.getByLabel('1 cup red lentils').check();
	await page.getByLabel('2 carrots').check();
	await page.getByRole('button', { name: 'Add selected to shopping list' }).click();
	await expect(page.getByText('2 items added to the shopping list')).toBeVisible();

	await page.goto('/lists/shopping');
	// The product is the item; the amount is its quantity.
	await expect(page.getByText('Red lentils', { exact: true })).toBeVisible();
	await expect(page.getByText('Carrots', { exact: true })).toBeVisible();
	await expect(page.getByText('Onion', { exact: true })).toHaveCount(0);
});
