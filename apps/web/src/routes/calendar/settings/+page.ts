import { redirect } from '@sveltejs/kit';

/** Phone feeds moved under You; subscriptions and tags under Family. */
export const load = ({ url }) => {
	const tab = url.searchParams.get('tab');
	if (tab === 'subscriptions' || tab === 'tags') redirect(307, '/settings/calendars');
	redirect(307, '/settings/calendar-feed');
};
