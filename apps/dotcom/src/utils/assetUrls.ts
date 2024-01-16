// eslint-disable-next-line import/no-internal-modules
import type { AssetUrls } from '@tldraw/assets/types'
// eslint-disable-next-line import/no-internal-modules
import { getAssetUrlsByMetaUrl } from '@tldraw/assets/urls'
import { isProductionEnv } from './env'

const _assetUrls = getAssetUrlsByMetaUrl()

export const assetUrls: AssetUrls = isProductionEnv
	? _assetUrls
	: // let's try out shantell sans 'informal' style for a bit on staging/dev
		{
			..._assetUrls,
			fonts: {
				..._assetUrls.fonts,
				draw: '/Shantell_Sans-Tldrawish.woff2',
			},
		}

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
