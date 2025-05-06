import {
	createIntlCache,
	IntlShape,
	MessageDescriptor,
	createIntl as originalCreateIntl,
	defineMessages as originalDefineMessages,
	ResolvedIntlConfig,
} from '@formatjs/intl'
import { defaultI18n, fetch, LANGUAGES, TLI18n } from '@tldraw/editor'
import md5 from 'md5'
import { defaultUiAssetUrls } from '../assetUrls'
import { TLUiTranslationKey } from '../hooks/useTranslation/TLUiTranslationKey'
import { getLoadedTranslation } from '../hooks/useTranslation/useTranslation'

/** @public @react */
export const TldrawI18n = () => {
	const loadedTranslation = getLoadedTranslation()

	if (!loadedTranslation) return defaultI18n()

	if (
		loadedTranslation.locale !== defaultI18n().locale ||
		(presetIntl && loadedTranslation.locale !== presetIntl.locale)
	) {
		fetchICULocale(loadedTranslation.locale)
	}

	return {
		locale: loadedTranslation.locale,
		dir: loadedTranslation.dir,
		translate: (msg?: Exclude<string, TLUiTranslationKey> | string | MessageDescriptor) => {
			if (typeof msg === 'object' && msg.defaultMessage && presetIntl) {
				return presetIntl.formatMessage(msg)
			}
			return loadedTranslation.messages[msg as TLUiTranslationKey] ?? msg
		},
	} as TLI18n
}

let isLoading = false
async function fetchICULocale(locale: string) {
	if (locale === 'en' || isLoading) {
		return
	}

	isLoading = true
	const language = LANGUAGES.find((t) => t.locale === locale)

	if (!language) {
		console.warn(`No translation found for locale ${locale}`)
		return {}
	}
	const res = await fetch(defaultUiAssetUrls.i18n[language.locale])
	isLoading = false
	const messages: ResolvedIntlConfig['messages'] = await res.json()

	if (!presetIntl || presetIntl.locale !== locale) {
		// @ts-ignore this is fine.
		createIntl({
			defaultLocale: defaultI18n().locale,
			locale,
			messages,
		})
	}
}

// This is optional but highly recommended since it prevents memory leaks.
// See: https://formatjs.github.io/docs/react-intl/api/#createintl
const cache = createIntlCache()
let presetIntl: IntlShape | null = null
export function createIntl(options: IntlShape) {
	presetIntl = originalCreateIntl(options, cache)
}

// This matches the extraction tool pattern:
//   --id-interpolation-pattern '[md5:contenthash:hex:10]'
function generateId({ id, description, defaultMessage }: MessageDescriptor) {
	if (id) {
		return id
	}

	return md5((description ? `${defaultMessage}#${description}` : defaultMessage) as string).slice(
		0,
		10
	)
}

// We programmatically define ID's for messages to make things easier for devs.
export function defineMessages<T extends string, D extends MessageDescriptor>(
	msgs: Record<T, D>
): Record<T, D> {
	for (const key in msgs) {
		if (!msgs[key].id) {
			msgs[key].id = generateId(msgs[key])
		}
	}
	return originalDefineMessages(msgs)
}
