import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite'
import { Image } from 'tldraw'

export const assetUrls = getAssetUrlsByImport()

let didPreloadIcons = false
async function preloadIcons() {
	if (didPreloadIcons) return
	didPreloadIcons = true
	const urlsToPreload = new Set(
		[...Object.values(assetUrls.icons), ...Object.values(assetUrls.embedIcons)].map((url) =>
			url.replace(/#.*$/, '')
		)
	)

	await Promise.allSettled(Array.from(urlsToPreload, preloadIcon))
}

function preloadIcon(url: string) {
	return new Promise((resolve, reject) => {
		const image = Image()
		// this isn't known by typescript but it works
		;(image as any).fetchPriority = 'low'
		image.onload = resolve
		image.onerror = reject
		image.referrerPolicy = 'strict-origin-when-cross-origin'
		image.src = url
	})
}

preloadIcons()
