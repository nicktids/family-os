/**
 * Opens an in-app path through the router: an extension cannot import the app's navigation, but
 * the router handles clicks on links, including one made here.
 */
export function openPath(href: string): void {
	const link = document.createElement('a');
	link.href = href;
	document.body.append(link);
	link.click();
	link.remove();
}
