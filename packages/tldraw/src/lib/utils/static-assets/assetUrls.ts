import { RecursivePartial, getDefaultCdnBaseUrl } from '@tldraw/editor'
import { useMemo } from 'react'

/** @public */
export interface TLEditorAssetUrls {
	fonts: {
		monospace: string
		monospaceItalic: string
		monospaceBold: string
		monospaceBoldItalic: string
		serif: string
		serifItalic: string
		serifBold: string
		serifBoldItalic: string
		sansSerif: string
		sansSerifItalic: string
		sansSerifBold: string
		sansSerifBoldItalic: string
		draw: string
	}
}

/** @public */
export let defaultEditorAssetUrls: TLEditorAssetUrls = {
	fonts: {
		draw: `${getDefaultCdnBaseUrl()}/fonts/Shantell_Sans-Tldrawish.woff2`,
		serif: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexSerif-Medium.woff2`,
		serifItalic: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexSerif-MediumItalic.woff2`,
		serifBold: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexSerif-Bold.woff2`,
		serifBoldItalic: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexSerif-BoldItalic.woff2`,
		sansSerif: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexSans-Medium.woff2`,
		sansSerifItalic: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexSans-MediumItalic.woff2`,
		sansSerifBold: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexSans-Bold.woff2`,
		sansSerifBoldItalic: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexSans-BoldItalic.woff2`,
		monospace: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexMono-Medium.woff2`,
		monospaceItalic: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexMono-MediumItalic.woff2`,
		monospaceBold: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexMono-Bold.woff2`,
		monospaceBoldItalic: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexMono-BoldItalic.woff2`,
	},
}

/** @internal */
export function setDefaultEditorAssetUrls(assetUrls: TLEditorAssetUrls) {
	defaultEditorAssetUrls = assetUrls
}

/** @internal */
export function useDefaultEditorAssetsWithOverrides(
	overrides?: RecursivePartial<TLEditorAssetUrls>
): TLEditorAssetUrls {
	return useMemo(() => {
		if (!overrides) return defaultEditorAssetUrls

		return {
			fonts: { ...defaultEditorAssetUrls.fonts, ...overrides?.fonts },
		}
	}, [overrides])
}
