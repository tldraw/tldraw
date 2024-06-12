import { RecursivePartial } from '@tldraw/editor'
import { useMemo } from 'react'
import { version } from '../../ui/version'

/** @public */
export interface TLEditorAssetUrls {
	fonts: {
		monospace: string
		serif: string
		sansSerif: string
		draw: string
	}
}

/** @public */
export let defaultEditorAssetUrls: TLEditorAssetUrls = {
	fonts: {
		draw: `https://cdn.tldraw.com/${version}/fonts/Shantell_Sans-Tldrawish.woff2`,
		serif: `https://cdn.tldraw.com/${version}/fonts/IBMPlexSerif-Medium.woff2`,
		sansSerif: `https://cdn.tldraw.com/${version}/fonts/IBMPlexSans-Medium.woff2`,
		monospace: `https://cdn.tldraw.com/${version}/fonts/IBMPlexMono-Medium.woff2`,
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
