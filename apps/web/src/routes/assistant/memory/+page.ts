import { redirect } from '@sveltejs/kit';

/** What the assistant remembers moved into settings, under You. */
export const load = ({ url }) => {
	redirect(307, `/settings/memory${url.search}`);
};
