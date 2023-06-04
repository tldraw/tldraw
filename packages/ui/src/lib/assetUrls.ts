import {
	EMBED_DEFINITIONS,
	LANGUAGES,
	TLEditorAssetUrls,
	defaultEditorAssetUrls,
} from '@tldraw/editor'
import { TLUiIconType, iconTypes } from './icon-types'

export type TLUiAssetUrls = TLEditorAssetUrls & {
	icons: Record<TLUiIconType, string>
	translations: Record<(typeof LANGUAGES)[number]['locale'], string>
	embedIcons: Record<(typeof EMBED_DEFINITIONS)[number]['type'], string>
}

export let defaultUiAssetUrls: TLUiAssetUrls = {
	...defaultEditorAssetUrls,
	icons: Object.fromEntries(iconTypes.map((name) => [name, `/icons/icon/${name}.svg`])) as Record<
		TLUiIconType,
		string
	>,
	translations: Object.fromEntries(
		LANGUAGES.map((lang) => [lang.locale, `/translations/${lang.locale}.json`])
	) as Record<(typeof LANGUAGES)[number]['locale'], string>,
	embedIcons: Object.fromEntries(
		EMBED_DEFINITIONS.map((def) => [def.type, `/embed-icons/${def.type}.png`])
	) as Record<(typeof EMBED_DEFINITIONS)[number]['type'], string>,
}

/** @internal */
export function setDefaultUiAssetUrls(urls: TLUiAssetUrls) {
	defaultUiAssetUrls = urls
}
