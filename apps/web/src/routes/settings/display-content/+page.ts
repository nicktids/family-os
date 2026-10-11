import { redirect } from '@sveltejs/kit';

/** Display content is a section of Devices and displays. */
export const load = ({ url }) => {
	redirect(307, `/settings/devices${url.search}`);
};
