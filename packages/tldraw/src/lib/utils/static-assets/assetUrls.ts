import { RecursivePartial, getDefaultCdnBaseUrl } from '@tldraw/editor'
import { useMemo } from 'react'

/** @public */
export interface TLEditorAssetUrls {
	fonts?: {
		tldraw_mono?: string
		tldraw_mono_italic?: string
		tldraw_mono_bold?: string
		tldraw_mono_italic_bold?: string
		tldraw_serif?: string
		tldraw_serif_italic?: string
		tldraw_serif_bold?: string
		tldraw_serif_italic_bold?: string
		tldraw_sans?: string
		tldraw_sans_italic?: string
		tldraw_sans_bold?: string
		tldraw_sans_italic_bold?: string
		tldraw_draw?: string
		tldraw_draw_italic?: string
		tldraw_draw_bold?: string
		tldraw_draw_italic_bold?: string
		[key: string]: string | undefined
	}
}

const cdn = getDefaultCdnBaseUrl()

/** @public */
export let defaultEditorAssetUrls: TLEditorAssetUrls = {
	fonts: {
		tldraw_mono: `${cdn}/fonts/IBMPlexMono-Medium.woff2`,
		tldraw_mono_italic: `${cdn}/fonts/IBMPlexMono-MediumItalic.woff2`,
		tldraw_mono_bold: `${cdn}/fonts/IBMPlexMono-Bold.woff2`,
		tldraw_mono_italic_bold: `${cdn}/fonts/IBMPlexMono-BoldItalic.woff2`,
		tldraw_serif: `${cdn}/fonts/IBMPlexSerif-Medium.woff2`,
		tldraw_serif_italic: `${cdn}/fonts/IBMPlexSerif-MediumItalic.woff2`,
		tldraw_serif_bold: `${cdn}/fonts/IBMPlexSerif-Bold.woff2`,
		tldraw_serif_italic_bold: `${cdn}/fonts/IBMPlexSerif-BoldItalic.woff2`,
		tldraw_sans: `${cdn}/fonts/IBMPlexSans-Medium.woff2`,
		tldraw_sans_italic: `${cdn}/fonts/IBMPlexSans-MediumItalic.woff2`,
		tldraw_sans_bold: `${cdn}/fonts/IBMPlexSans-Bold.woff2`,
		tldraw_sans_italic_bold: `${cdn}/fonts/IBMPlexSans-BoldItalic.woff2`,
		tldraw_draw: `${cdn}/fonts/Shantell_Sans-Informal_Regular.woff2`,
		tldraw_draw_italic: `${cdn}/fonts/Shantell_Sans-Informal_Regular_Italic.woff2`,
		tldraw_draw_bold: `${cdn}/fonts/Shantell_Sans-Informal_Bold.woff2`,
		tldraw_draw_italic_bold: `${cdn}/fonts/Shantell_Sans-Informal_Bold_Italic.woff2`,
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
			fonts: { ...defaultEditorAssetUrls.fonts, ...overrides.fonts },
		}
	}, [overrides])
}
