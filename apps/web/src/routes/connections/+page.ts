import { redirect } from '@sveltejs/kit';

/** AI apps (MCP) moved into settings, under You. */
export const load = ({ url }) => {
	redirect(307, `/settings/connected-apps${url.search}`);
};
