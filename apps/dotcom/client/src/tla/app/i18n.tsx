import {
	FormattedMessage,
	IntlConfig,
	IntlShape,
	MessageDescriptor,
	createIntlCache,
	createIntl as originalCreateIntl,
	defineMessages as originalDefineMessages,
	useIntl,
} from 'react-intl'

import MD5 from 'md5.js'
import { ComponentPropsWithoutRef } from 'react'

// Re-export everything and override below what we want to override.
// eslint-disable-next-line
export * from 'react-intl'

const INTERNAL_LOCALES = ['xx-AE', 'xx-LS']

// This matches the extraction tool pattern:
//   --id-interpolation-pattern '[md5:contenthash:hex:10]'
function generateId({ id, description, defaultMessage }: MessageDescriptor) {
	if (id) {
		return id
	}

	return new MD5()
		.update(description ? `${defaultMessage}#${description}` : defaultMessage)
		.digest('hex')
		.slice(0, 10)
}

export function F(props: ComponentPropsWithoutRef<typeof FormattedMessage>) {
	const intl = useIntl()
	const id = generateId(props)
	let internalMessage = (props.defaultMessage || '') as string
	if (intl.locale === 'xx-AE') {
		internalMessage = `${internalMessage.replace(/a/g, 'á').replace(/e/g, 'é').replace(/i/g, 'í').replace(/o/g, 'ó').replace(/u/g, 'ú')}`
	} else if (intl.locale === 'xx-LS') {
		internalMessage = `${internalMessage}looooooooooooooooong`
	}

	return (
		<span className="i18n-msg">
			{isInternalLocale(intl.locale) ? (
				<>{internalMessage}</>
			) : (
				/* eslint-disable-next-line formatjs/enforce-default-message */
				<FormattedMessage id={id} {...props} />
			)}
		</span>
	)
}

// We programmatically define ID's for messages to make things easier for devs.
export function defineMessages(values: Record<string | number | symbol, MessageDescriptor>) {
	for (const key in values) {
		if (!values[key].id) {
			values[key].id = generateId(values[key])
		}
	}
	return originalDefineMessages(values)
}

export function isInternalLocale(locale: string) {
	return INTERNAL_LOCALES.indexOf(locale) !== -1
}

// This is optional but highly recommended since it prevents memory leaks.
// See: https://formatjs.io/docs/intl/#createintl
const cache = createIntlCache()
let presetIntl: IntlShape | null = null
let didSetupCreateIntl = false
export function setupCreateIntl({ defaultLocale, locale, messages }: IntlConfig) {
	presetIntl = originalCreateIntl(
		{
			defaultLocale,
			locale,
			messages,
		},
		cache
	)

	didSetupCreateIntl = true
}

// createIntl is used in non-React locations.
export function createIntl(options: IntlShape) {
	if (options) {
		return originalCreateIntl(options)
	} else {
		if (!didSetupCreateIntl) {
			throw new Error('Need to run setupCreateIntl to use createIntl without options.')
		}
		return presetIntl
	}
}
