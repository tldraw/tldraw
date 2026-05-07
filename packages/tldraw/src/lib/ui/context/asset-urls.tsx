import { Image } from '@tldraw/editor'
import { createContext, useContext, useEffect } from 'react'
import { TLUiAssetUrls } from '../assetUrls'

/** @internal */
type UiAssetUrlsContextType = TLUiAssetUrls | null

const AssetUrlsContext = createContext<UiAssetUrlsContextType>(null)

function noop() {
	// Swallow image.decode() rejections (e.g. EncodingError) from icon preload —
	// preload is best-effort and any real load failure surfaces where the icon is used.
}

/** @internal */
export function AssetUrlsProvider({
	assetUrls,
	children,
}: {
	assetUrls: TLUiAssetUrls
	children: React.ReactNode
}) {
	useEffect(() => {
		for (const src of Object.values(assetUrls.icons)) {
			if (!src) continue

			const image = Image()
			image.crossOrigin = 'anonymous'
			image.src = src
			image.decode().catch(noop)
		}
		for (const src of Object.values(assetUrls.embedIcons)) {
			if (!src) continue

			const image = Image()
			image.crossOrigin = 'anonymous'
			image.src = src
			image.decode().catch(noop)
		}
	}, [assetUrls])

	return <AssetUrlsContext.Provider value={assetUrls}>{children}</AssetUrlsContext.Provider>
}

/** @internal */
export function useAssetUrls() {
	const assetUrls = useContext(AssetUrlsContext)
	if (!assetUrls) {
		throw new Error('useAssetUrls must be used within an AssetUrlsProvider')
	}

	return assetUrls
}
