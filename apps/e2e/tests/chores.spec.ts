import { expect, setUpAndSignIn, test } from '../support/fixtures.ts';
import { createMember } from '../support/members.ts';

test('a daily chore taking turns: ticking it off hands it to the other person, and undo takes it back', async ({
	page,
}) => {
	await setUpAndSignIn(page);
	await createMember(page, { name: 'Elif', role: 'member' });

	await page.goto('/more');
	await page.getByRole('link', { name: 'Chores' }).click();
	await expect(page.getByRole('heading', { name: 'Chores', exact: true })).toBeVisible();

	// Two people in turn order, round robin, every day.
	await page.getByRole('button', { name: 'Add chore' }).click();
	await page.getByLabel('Chore', { exact: true }).fill('Dishes');
	await page.getByRole('button', { name: 'Every day' }).click();
	await page.getByRole('button', { name: 'Deniz' }).click();
	await page.getByRole('button', { name: 'Elif' }).click();
	await expect(page.getByLabel('How the turn moves on')).toHaveValue('round_robin');
	await page.getByRole('button', { name: 'Save' }).click();

	const row = page.getByRole('listitem').filter({ hasText: 'Dishes' });
	await expect(row).toContainText('Today');
	await expect(row).toContainText('Deniz');

	// One tap: done, and the turn moves on to Elif tomorrow.
	await page.getByRole('button', { name: 'Mark “Dishes” done' }).click();
	await expect(page.getByText('Dishes done')).toBeVisible();
	await expect(row).toContainText('Tomorrow');
	await expect(row).toContainText('Elif');

	// Undo from the notice gives the turn back to Deniz, due today again.
	await page.getByRole('button', { name: 'Undo' }).click();
	await expect(row).toContainText('Today');
	await expect(row).toContainText('Deniz');
});
