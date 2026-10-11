import { redirect } from '@sveltejs/kit';

/**
 * On windows 1024 px wide and more More has no page of its own: settings open, whose first page
 * (Profile & sign-in) is open to everyone. Deciding here, before anything renders, keeps a link
 * clicked right after loading from being overtaken by the redirect.
 */
export const load = () => {
	if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches)
		redirect(307, '/settings/profile');
};
