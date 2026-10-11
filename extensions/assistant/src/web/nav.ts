/**
 * Opens an in-app path through the router: an extension cannot import the app's navigation, but
 * the router handles clicks on links, including one made here. The scroll position stays (the
 * page only changes which conversation it shows).
 */
export function openPath(href: string): void {
	const link = document.createElement('a');
	link.href = href;
	link.dataset.sveltekitNoscroll = '';
	document.body.append(link);
	link.click();
	link.remove();
}
