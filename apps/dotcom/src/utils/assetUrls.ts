import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite'

export const assetUrls = getAssetUrlsByImport()

let didPreloadIcons = false
async function preloadIcons() {
	if (didPreloadIcons) return
	didPreloadIcons = true
	const urlsToPreload = [...Object.values(assetUrls.icons), ...Object.values(assetUrls.embedIcons)]
	await Promise.allSettled(urlsToPreload.map(preloadIcon))
}

function preloadIcon(url: string) {
	return new Promise((resolve, reject) => {
		const image = new Image()
		// this isn't known by typescript but it works
		;(image as any).fetchPriority = 'low'
		image.onload = resolve
		image.onerror = reject
		image.src = url
	})
}

preloadIcons()
