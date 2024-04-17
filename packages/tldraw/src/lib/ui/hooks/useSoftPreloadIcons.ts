import { useEffect } from 'react'
import { useAssetUrls } from '../context/asset-urls'

/**
 * Trigger icons to load but don't block the editor from appearing while they load.
 *
 * @internal */
export function useSoftPreloadIcons() {
	const assetUrls = useAssetUrls()

	useEffect(() => {
		for (const src of Object.values(assetUrls.icons)) {
			const image = new Image()
			image.src = src
			image.decode()
		}
		for (const src of Object.values(assetUrls.embedIcons)) {
			const image = new Image()
			image.src = src
			image.decode()
		}
	}, [assetUrls])
}
