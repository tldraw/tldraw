const getLicenseKey = () =>
	process.env.TLDRAW_LICENSE ||
	'tldraw-tldraw-2027-07-10/WyJ2UFhWM3pQXyIsWyIqLnRsZHJhdy5jb20iLCIqLnRsZHJhdy5kZXYiLCIqLnRsZHJhdy5jbHViIiwiKi50bGRyYXcud29ya2Vycy5kZXYiXSw3MywiMjAyNy0wNy0xMCJd.FrzdF5VBeeeGIqQELpXvNAyIy/Ow9ZJJT5qkuRD42atd5FyhlR0xYasIZvaQcG9tSAFgjq8DMcc/yopspHmWyw'
export default getLicenseKey

/**
 * The key the thumbnail render page runs under. An html-mode capture (see THUMBNAIL_RENDER_INLINE)
 * loads the page without navigating, so it has no hostname, and the app key's `*.tldraw.com` hosts
 * fail the SDK's domain check: the editor is then unmounted five seconds after mount with no
 * terminal marker, and every render that settles slower than that burns the whole Browser Run
 * timeout. A key with a `*` host, supplied at build time as TLDRAW_RENDER_LICENSE, is what lets
 * that page stay mounted. Falls back to the app key, which is right for url-mode captures.
 */
export function getThumbnailRenderLicenseKey() {
	return process.env.TLDRAW_RENDER_LICENSE || getLicenseKey()
}
