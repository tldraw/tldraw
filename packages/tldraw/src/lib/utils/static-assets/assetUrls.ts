import { RecursivePartial } from '@tldraw/editor'
import { useMemo } from 'react'
import { version } from '../../ui/version'

/** @internal */
const CDN_BASE_URL = 'https://cdn.tldraw.com'

/** @public */
export function getDefaultCdnBaseUrl() {
	return `${CDN_BASE_URL}/${version}`
}

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
		draw: `${getDefaultCdnBaseUrl()}/fonts/Shantell_Sans-Tldrawish.woff2`,
		serif: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexSerif-Medium.woff2`,
		sansSerif: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexSans-Medium.woff2`,
		monospace: `${getDefaultCdnBaseUrl()}/fonts/IBMPlexMono-Medium.woff2`,
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
