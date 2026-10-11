import { type Browser, devices, type Page } from '@playwright/test';
import { ADMIN, api, signInWithPassword } from './fixtures.ts';
import type { FamilyOS } from './server.ts';

/** A phone, like the real family devices: used for every second person's browser context. */
export const PHONE = { ...devices['Pixel 7'], locale: 'en-US', timezoneId: 'Europe/Istanbul' };

/** Creates a member through the API (as the signed-in admin of `page`) and returns its id. */
export async function createMember(
	page: Page,
	member: {
		name: string;
		role: 'admin' | 'member' | 'supervised' | (string & {});
		about?: string;
		/** With `password`, the member can sign in with an email and a password. */
		email?: string;
		password?: string;
		pin?: string;
	},
): Promise<string> {
	const created = await api<{ output: { id: string } }>(
		page,
		'POST',
		'/api/v1/actions/core.createMember',
		{
			displayName: member.name,
			roleId: member.role,
			...(member.about !== undefined && { about: member.about }),
		},
	);
	const id = created.output.id;
	if (member.password !== undefined) {
		if (member.email === undefined) throw new Error('createMember: a password needs an email');
		await api(page, 'PUT', `/api/v1/core/members/${id}/password`, {
			email: member.email,
			password: member.password,
		});
	}
	if (member.pin !== undefined)
		await api(page, 'PUT', `/api/v1/core/members/${id}/pin`, { pin: member.pin });
	return id;
}

/** A second browser (a phone) signed in with an email and a password. Close its context after. */
export async function signInAs(
	browser: Browser,
	family: FamilyOS,
	login: { email: string; password: string },
) {
	const context = await browser.newContext({ ...PHONE, baseURL: family.url });
	const page = await context.newPage();
	await signInWithPassword(page, login.email, login.password);
	return { context, page };
}

/**
 * A kitchen tablet: the admin marks the device as a family device, then signs out, so the login
 * page shows the PIN profiles. Close its context after.
 */
export async function familyTablet(browser: Browser, family: FamilyOS) {
	const { context, page } = await signInAs(browser, family, ADMIN);
	await api(page, 'POST', '/api/v1/core/devices/trust', { name: 'Kitchen tablet' });
	await api(page, 'POST', '/api/auth/sign-out', {});
	return { context, page };
}

/** The family tablet, with `name` signed in through the profile picker and keypad. */
export async function signInWithPin(browser: Browser, family: FamilyOS, name: string, pin: string) {
	const { context, page } = await familyTablet(browser, family);
	await page.goto('/login');
	await page.getByRole('button', { name }).click();
	for (const digit of pin) await page.getByRole('button', { name: digit, exact: true }).click();
	await page.getByRole('button', { name: 'Sign in', exact: true }).click();
	await page.getByTestId('day-sentence').filter({ hasText: name }).waitFor();
	return { context, page };
}
