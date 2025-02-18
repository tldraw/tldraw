import { RecursivePartial, getDefaultCdnBaseUrl } from '@tldraw/editor'
import { useMemo } from 'react'

/** @public */
export interface TLEditorAssetUrls {
	fonts?: {
		tldraw_mono_normal_500?: string
		tldraw_mono_italic_500?: string
		tldraw_mono_normal_700?: string
		tldraw_mono_italic_700?: string
		tldraw_serif_normal_500?: string
		tldraw_serif_italic_500?: string
		tldraw_serif_normal_700?: string
		tldraw_serif_italic_700?: string
		tldraw_sans_normal_500?: string
		tldraw_sans_italic_500?: string
		tldraw_sans_normal_700?: string
		tldraw_sans_italic_700?: string
		tldraw_draw?: string
		[key: string]: string | undefined
	}
}

/** @public */
export let defaultEditorAssetUrls: TLEditorAssetUrls = {
	fonts: {
		tldraw_mono_normal_500: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexMono-Medium.woff2`,
		tldraw_mono_italic_500: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexMono-MediumItalic.woff2`,
		tldraw_mono_normal_700: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexMono-Bold.woff2`,
		tldraw_mono_italic_700: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexMono-BoldItalic.woff2`,
		tldraw_serif_normal_500: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexSerif-Medium.woff2`,
		tldraw_serif_italic_500: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexSerif-MediumItalic.woff2`,
		tldraw_serif_normal_700: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexSerif-Bold.woff2`,
		tldraw_serif_italic_700: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexSerif-BoldItalic.woff2`,
		tldraw_sans_normal_500: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexSans-Medium.woff2`,
		tldraw_sans_italic_500: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexSans-MediumItalic.woff2`,
		tldraw_sans_normal_700: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexSans-Bold.woff2`,
		tldraw_sans_italic_700: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexSans-BoldItalic.woff2`,
		tldraw_draw: `${getDefaultCdnBaseUrl()}/fonts/Shantell_Sans-Tldrawish.woff2`,
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
