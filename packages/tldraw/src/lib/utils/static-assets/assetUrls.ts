import { RecursivePartial } from '@tldraw/editor'
import { useMemo } from 'react'
import { version } from '../../ui/version'

/** @internal */
const CDN_BASE_URL = 'https://cdn.tldraw.com'

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
		draw: `${CDN_BASE_URL}/${version}/fonts/Shantell_Sans-Tldrawish.woff2`,
		serif: `${CDN_BASE_URL}/${version}/fonts/IBMPlexSerif-Medium.woff2`,
		sansSerif: `${CDN_BASE_URL}/${version}/fonts/IBMPlexSans-Medium.woff2`,
		monospace: `${CDN_BASE_URL}/${version}/fonts/IBMPlexMono-Medium.woff2`,
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

/** @public */
export function getDefaultCdnBaseUrl() {
	return `${CDN_BASE_URL}/${version}`
}
