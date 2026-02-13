import { LANGUAGES, RecursivePartial, getDefaultCdnBaseUrl } from '@tldraw/editor'
import { useMemo } from 'react'
import { DEFAULT_EMBED_DEFINITIONS } from '../defaultEmbedDefinitions'
import { TLEditorAssetUrls, defaultEditorAssetUrls } from '../utils/static-assets/assetUrls'
import { TLUiIconType, iconTypes } from './icon-types'

/** @public */
export interface TLUiAssetUrls extends TLEditorAssetUrls {
	icons: Record<TLUiIconType | Exclude<string, TLUiIconType>, string>
	translations: Record<(typeof LANGUAGES)[number]['locale'], string>
	embedIcons: Partial<Record<(typeof DEFAULT_EMBED_DEFINITIONS)[number]['type'], string>>
}

/** @public */
export type TLUiAssetUrlOverrides = RecursivePartial<TLUiAssetUrls>

export let defaultUiAssetUrls: TLUiAssetUrls = {
	...defaultEditorAssetUrls,
	icons: Object.fromEntries(
		iconTypes.map((name) => [name, `${getDefaultCdnBaseUrl()}/icons/icon/0_merged.svg#${name}`])
	) as Record<TLUiIconType, string>,
	translations: Object.fromEntries(
		LANGUAGES.map((lang) => [
			lang.locale,
			`${getDefaultCdnBaseUrl()}/translations/${lang.locale}.json`,
		])
	) as Record<(typeof LANGUAGES)[number]['locale'], string>,
	embedIcons: Object.fromEntries(
		DEFAULT_EMBED_DEFINITIONS.map((def) => [
			def.type,
			`${getDefaultCdnBaseUrl()}/embed-icons/${def.type}.png`,
		])
	) as Record<(typeof DEFAULT_EMBED_DEFINITIONS)[number]['type'], string>,
}

/** @internal */
export function setDefaultUiAssetUrls(urls: TLUiAssetUrls) {
	defaultUiAssetUrls = urls
}

/** @internal */
export function useDefaultUiAssetUrlsWithOverrides(
	overrides?: TLUiAssetUrlOverrides
): TLUiAssetUrls {
	return useMemo(() => {
		if (!overrides) return defaultUiAssetUrls

		return {
			fonts: Object.assign({ ...defaultUiAssetUrls.fonts }, { ...overrides?.fonts }),
			icons: Object.assign({ ...defaultUiAssetUrls.icons }, { ...overrides?.icons }),
			embedIcons: Object.assign({ ...defaultUiAssetUrls.embedIcons }, { ...overrides?.embedIcons }),
			translations: Object.assign(
				{ ...defaultUiAssetUrls.translations },
				{ ...overrides?.translations }
			),
		}
	}, [overrides])
}
