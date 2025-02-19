import { RecursivePartial, getDefaultCdnBaseUrl } from '@tldraw/editor'
import { useMemo } from 'react'

/** @public */
export interface TLEditorAssetUrls {
	fonts?: {
		tldraw_mono_normal_normal?: string
		tldraw_mono_italic_normal?: string
		tldraw_mono_normal_bold?: string
		tldraw_mono_italic_bold?: string
		tldraw_serif_normal_normal?: string
		tldraw_serif_italic_normal?: string
		tldraw_serif_normal_bold?: string
		tldraw_serif_italic_bold?: string
		tldraw_sans_normal_normal?: string
		tldraw_sans_italic_normal?: string
		tldraw_sans_normal_bold?: string
		tldraw_sans_italic_bold?: string
		tldraw_draw_normal_normal?: string
		tldraw_draw_italic_normal?: string
		tldraw_draw_normal_bold?: string
		tldraw_draw_italic_bold?: string
		[key: string]: string | undefined
	}
}

/** @public */
export let defaultEditorAssetUrls: TLEditorAssetUrls = {
	fonts: {
		tldraw_mono_normal_normal: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexMono-Medium.woff2`,
		tldraw_mono_italic_normal: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexMono-MediumItalic.woff2`,
		tldraw_mono_normal_bold: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexMono-Bold.woff2`,
		tldraw_mono_italic_bold: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexMono-BoldItalic.woff2`,
		tldraw_serif_normal_normal: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexSerif-Medium.woff2`,
		tldraw_serif_italic_normal: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexSerif-MediumItalic.woff2`,
		tldraw_serif_normal_bold: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexSerif-Bold.woff2`,
		tldraw_serif_italic_bold: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexSerif-BoldItalic.woff2`,
		tldraw_sans_normal_normal: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexSans-Medium.woff2`,
		tldraw_sans_italic_normal: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexSans-MediumItalic.woff2`,
		tldraw_sans_normal_bold: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexSans-Bold.woff2`,
		tldraw_sans_italic_bold: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexSans-BoldItalic.woff2`,
		tldraw_draw_normal_normal: `${getDefaultCdnBaseUrl()}/fonts/Shantell_Sans-Informal_Regular.woff2`,
		tldraw_draw_italic_normal: `${getDefaultCdnBaseUrl()}/fonts/Shantell_Sans-Informal_Regular_Italic.woff2`,
		tldraw_draw_normal_bold: `${getDefaultCdnBaseUrl()}/fonts/Shantell_Sans-Informal_Bold.woff2`,
		tldraw_draw_italic_bold: `${getDefaultCdnBaseUrl()}/fonts/Shantell_Sans-Informal_Bold_Italic.woff2`,
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
