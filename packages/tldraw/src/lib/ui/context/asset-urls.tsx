import { createContext, useContext, useEffect } from 'react'
import { TLUiAssetUrls } from '../assetUrls'

/** @internal */
type UiAssetUrlsContextType = TLUiAssetUrls | null

const AssetUrlsContext = createContext<UiAssetUrlsContextType>(null)

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
