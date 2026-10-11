import { redirect } from '@sveltejs/kit';

/** Languages merged into Language and region. */
export const load = ({ url }) => {
	redirect(307, `/settings/region${url.search}`);
};
