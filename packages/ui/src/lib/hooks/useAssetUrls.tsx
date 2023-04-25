import { createContext, useContext } from 'react'
import { UiAssetUrls } from '../assetUrls'

const AssetUrlsContext = createContext<UiAssetUrls | null>(null)

/** @public */
export function AssetUrlsProvider({
	assetUrls,
	children,
}: {
	assetUrls: UiAssetUrls
	children: React.ReactNode
}) {
	return <AssetUrlsContext.Provider value={assetUrls}>{children}</AssetUrlsContext.Provider>
}

/** @public */
export function useAssetUrls() {
	const assetUrls = useContext(AssetUrlsContext)
	if (!assetUrls) {
		throw new Error('useAssetUrls must be used within an AssetUrlsProvider')
	}

	return assetUrls
}
