import { redirect } from '@sveltejs/kit';

/** The old address of My account. */
export const load = ({ url }) => {
	redirect(307, `/settings/profile${url.search}`);
};
