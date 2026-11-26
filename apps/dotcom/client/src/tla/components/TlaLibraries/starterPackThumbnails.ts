/**
 * The URL of each starter pack thumbnail, by its path from this folder. The images are emitted as
 * assets named by their content hash; this map of their URLs is its own chunk, loaded with the
 * first pack listing that needs it.
 */
export const starterPackThumbnailUrls = import.meta.glob<string>(
	'./starterPackData/*/thumbnails/*.webp',
	{ eager: true, query: '?url', import: 'default' }
)
