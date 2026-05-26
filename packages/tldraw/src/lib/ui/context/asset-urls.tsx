import { Image, noop } from '@tldraw/editor'
import { createContext, useContext, useEffect } from 'react'
import { TLUiAssetUrls } from '../assetUrls'

/** @internal */
type UiAssetUrlsContextType = TLUiAssetUrls | null

const AssetUrlsContext = createContext<UiAssetUrlsContextType>(null)

/** @public */
export interface AssetUrlsProviderProps {
	assetUrls: TLUiAssetUrls
	children: React.ReactNode
}

/**
 * Provides asset URLs (icons, fonts, translations, embed icons) to the editor's UI.
 * Required when using `TldrawUiTranslationProvider` without `TldrawUiContextProvider`.
 *
 * @public @react
 */
export function AssetUrlsProvider({ assetUrls, children }: AssetUrlsProviderProps) {
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

/** @public */
export function useAssetUrls() {
	const assetUrls = useContext(AssetUrlsContext)
	if (!assetUrls) {
		throw new Error('useAssetUrls must be used within an AssetUrlsProvider')
	}

	return assetUrls
}
