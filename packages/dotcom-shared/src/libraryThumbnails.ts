/**
 * The name a library item's thumbnail image is stored under in the uploads bucket: a unique id,
 * then its image type, which is how a client tells an SVG thumbnail from its URL.
 */
export function libraryThumbnailObjectName(id: string, mimeType: string) {
	const extension = mimeType === 'image/svg+xml' ? 'svg' : mimeType.split('/')[1]
	return `${id}-${extension}`
}

/** Whether a library item thumbnail's URL is an SVG's. */
export function isSvgLibraryThumbnail(url: string) {
	return url.endsWith('-svg')
}
