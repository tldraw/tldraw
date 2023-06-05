/** @internal */
export function showCantWriteToIndexDbAlert() {
	window.alert(
		`Oops! We could not save changes to your browser's storage. We now need to reload the page and try again.

Keep seeing this message?
• If you're using tldraw in a private or "incognito" window, try loading tldraw in a regular window or in a different browser.
• If your hard disk is full, try clearing up some space and then reload the page.`
	)
}

/** @internal */
export function showCantReadFromIndexDbAlert() {
	window.alert(
		`Oops! We could not access your browser's storage—and the app won't work correctly without that. We now need to reload the page and try again.

Keep seeing this message?
• If you're using tldraw in a private or "incognito" window, try loading tldraw in a regular window or in a different browser.`
	)
}
