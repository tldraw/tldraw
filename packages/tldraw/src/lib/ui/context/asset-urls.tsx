import { createContext, useContext } from 'react'
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
