import { atom } from '@tldraw/state'
import { fetch } from '@tldraw/utils'
import { publishDates } from '../../version'
import { getDefaultCdnBaseUrl } from '../utils/assets'
import { importPublicKey, str2ab } from '../utils/licensing'

const GRACE_PERIOD_DAYS = 5

export const FLAGS = {
	ANNUAL_LICENSE: 0x1,
	PERPETUAL_LICENSE: 0x2,
	INTERNAL_LICENSE: 0x4,
	WITH_WATERMARK: 0x8,
}
const HIGHEST_FLAG = Math.max(...Object.values(FLAGS))

export const PROPERTIES = {
	ID: 0,
	HOSTS: 1,
	FLAGS: 2,
	EXPIRY_DATE: 3,
}
const NUMBER_OF_KNOWN_PROPERTIES = Object.keys(PROPERTIES).length

const LICENSE_EMAIL = 'sales@tldraw.com'

const WATERMARK_TRACK_SRC = `${getDefaultCdnBaseUrl()}/watermarks/watermark-track.svg`

/** @internal */
export interface LicenseInfo {
	id: string
	hosts: string[]
	flags: number
	expiryDate: string
}
/** @internal */
export type InvalidLicenseReason =
	| 'invalid-license-key'
	| 'no-key-provided'
	| 'has-key-development-mode'

/** @internal */
export type LicenseFromKeyResult = InvalidLicenseKeyResult | ValidLicenseKeyResult

/** @internal */
export interface InvalidLicenseKeyResult {
	isLicenseParseable: false
	reason: InvalidLicenseReason
}

/** @internal */
export interface ValidLicenseKeyResult {
	isLicenseParseable: true
	license: LicenseInfo
	isDevelopment: boolean
	isDomainValid: boolean
	expiryDate: Date
	isAnnualLicense: boolean
	isAnnualLicenseExpired: boolean
	isPerpetualLicense: boolean
	isPerpetualLicenseExpired: boolean
	isInternalLicense: boolean
	isLicensedWithWatermark: boolean
}

/** @internal */
export type TestEnvironment = 'development' | 'production'

/** @internal */
export class LicenseManager {
	private publicKey =
		'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEHJh0uUfxHtCGyerXmmatE368Hd9rI6LH9oPDQihnaCryRFWEVeOvf9U/SPbyxX74LFyJs5tYeAHq5Nc0Ax25LQ'
	public isDevelopment: boolean
	public isTest: boolean
	public isCryptoAvailable: boolean
	state = atom<'pending' | 'licensed' | 'licensed-with-watermark' | 'unlicensed'>(
		'license state',
		'pending'
	)
	public verbose = true

	constructor(
		licenseKey: string | undefined,
		testPublicKey?: string,
		testEnvironment?: TestEnvironment
	) {
		this.isTest = process.env.NODE_ENV === 'test'
		this.isDevelopment = this.getIsDevelopment(testEnvironment)
		this.publicKey = testPublicKey || this.publicKey
		this.isCryptoAvailable = !!crypto.subtle

		this.getLicenseFromKey(licenseKey).then((result) => {
			const isUnlicensed = isEditorUnlicensed(result)

			if (!this.isDevelopment && isUnlicensed) {
				fetch(WATERMARK_TRACK_SRC)
			}

			if (isUnlicensed) {
				this.state.set('unlicensed')
			} else if ((result as ValidLicenseKeyResult).isLicensedWithWatermark) {
				this.state.set('licensed-with-watermark')
			} else {
				this.state.set('licensed')
			}
		})
	}

	private getIsDevelopment(testEnvironment?: TestEnvironment) {
		if (testEnvironment === 'development') return true
		if (testEnvironment === 'production') return false

		// If we are using https we assume it's a production env and a development one otherwise
		return window.location.protocol !== 'https:'
	}

	private async extractLicenseKey(licenseKey: string): Promise<LicenseInfo> {
		const [data, signature] = licenseKey.split('.')
		const [prefix, encodedData] = data.split('/')

		if (!prefix.startsWith('tldraw-')) {
			throw new Error(`Unsupported prefix '${prefix}'`)
		}

		const publicCryptoKey = await importPublicKey(this.publicKey)

		let isVerified
		try {
			isVerified = await crypto.subtle.verify(
				{
					name: 'ECDSA',
					hash: { name: 'SHA-256' },
				},
				publicCryptoKey,
				new Uint8Array(str2ab(atob(signature))),
				new Uint8Array(str2ab(atob(encodedData)))
			)
		} catch (e) {
			console.error(e)
			throw new Error('Could not perform signature validation')
		}

		if (!isVerified) {
			throw new Error('Invalid signature')
		}

		let decodedData: any
		try {
			decodedData = JSON.parse(atob(encodedData))
		} catch (e) {
			throw new Error('Could not parse object')
		}
		if (decodedData.length > NUMBER_OF_KNOWN_PROPERTIES) {
			this.outputMessages([
				'License key contains some unknown properties.',
				'You may want to update tldraw packages to a newer version to get access to new functionality.',
			])
		}

		return {
			id: decodedData[PROPERTIES.ID],
			hosts: decodedData[PROPERTIES.HOSTS],
			flags: decodedData[PROPERTIES.FLAGS],
			expiryDate: decodedData[PROPERTIES.EXPIRY_DATE],
		}
	}

	async getLicenseFromKey(licenseKey?: string): Promise<LicenseFromKeyResult> {
		if (!licenseKey) {
			if (!this.isDevelopment) {
				this.outputNoLicenseKeyProvided()
			}

			return { isLicenseParseable: false, reason: 'no-key-provided' }
		}

		if (this.isDevelopment && !this.isCryptoAvailable) {
			if (this.verbose) {
				// eslint-disable-next-line no-console
				console.log(
					'tldraw: you seem to be in a development environment that does not support crypto. License not verified.'
				)
				// eslint-disable-next-line no-console
				console.log('You should check that this works in production separately.')
			}
			// We can't parse the license if we are in development mode since crypto
			// is not available on http
			return { isLicenseParseable: false, reason: 'has-key-development-mode' }
		}

		// Borrowed idea from AG Grid:
		// Copying from various sources (like PDFs) can include zero-width characters.
		// This helps makes sure the key validation doesn't fail.
		let cleanedLicenseKey = licenseKey.replace(/[\u200B-\u200D\uFEFF]/g, '')
		cleanedLicenseKey = cleanedLicenseKey.replace(/\r?\n|\r/g, '')

		try {
			const licenseInfo = await this.extractLicenseKey(cleanedLicenseKey)
			const expiryDate = new Date(licenseInfo.expiryDate)
			const isAnnualLicense = this.isFlagEnabled(licenseInfo.flags, FLAGS.ANNUAL_LICENSE)
			const isPerpetualLicense = this.isFlagEnabled(licenseInfo.flags, FLAGS.PERPETUAL_LICENSE)

			const result: ValidLicenseKeyResult = {
				license: licenseInfo,
				isLicenseParseable: true,
				isDevelopment: this.isDevelopment,
				isDomainValid: this.isDomainValid(licenseInfo),
				expiryDate,
				isAnnualLicense,
				isAnnualLicenseExpired: isAnnualLicense && this.isAnnualLicenseExpired(expiryDate),
				isPerpetualLicense,
				isPerpetualLicenseExpired: isPerpetualLicense && this.isPerpetualLicenseExpired(expiryDate),
				isInternalLicense: this.isFlagEnabled(licenseInfo.flags, FLAGS.INTERNAL_LICENSE),
				isLicensedWithWatermark: this.isFlagEnabled(licenseInfo.flags, FLAGS.WITH_WATERMARK),
			}
			this.outputLicenseInfoIfNeeded(result)

			return result
		} catch (e: any) {
			this.outputInvalidLicenseKey(e.message)
			// If the license can't be parsed, it's invalid
			return { isLicenseParseable: false, reason: 'invalid-license-key' }
		}
	}

	private isDomainValid(licenseInfo: LicenseInfo) {
		const currentHostname = window.location.hostname.toLowerCase()

		return licenseInfo.hosts.some((host) => {
			const normalizedHost = host.toLowerCase().trim()

			// Allow the domain if listed and www variations, 'example.com' allows 'example.com' and 'www.example.com'
			if (
				normalizedHost === currentHostname ||
				`www.${normalizedHost}` === currentHostname ||
				normalizedHost === `www.${currentHostname}`
			) {
				return true
			}

			// If host is '*', we allow all domains.
			if (host === '*') {
				// All domains allowed.
				return true
			}

			// Glob testing, we only support '*.somedomain.com' right now.
			if (host.includes('*')) {
				const globToRegex = new RegExp(host.replace(/\*/g, '.*?'))
				return globToRegex.test(currentHostname) || globToRegex.test(`www.${currentHostname}`)
			}

			return false
		})
	}

	private getExpirationDateWithoutGracePeriod(expiryDate: Date) {
		return new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate())
	}

	private getExpirationDateWithGracePeriod(expiryDate: Date) {
		return new Date(
			expiryDate.getFullYear(),
			expiryDate.getMonth(),
			expiryDate.getDate() + GRACE_PERIOD_DAYS + 1 // Add 1 day to include the expiration day
		)
	}

	private isAnnualLicenseExpired(expiryDate: Date) {
		const expiration = this.getExpirationDateWithGracePeriod(expiryDate)
		const isExpired = new Date() >= expiration
		// If it is not expired yet (including the grace period), but after the expiry date we warn the users
		if (!isExpired && new Date() >= this.getExpirationDateWithoutGracePeriod(expiryDate)) {
			this.outputMessages([
				'tldraw license is about to expire, you are in a grace period.',
				`Please reach out to ${LICENSE_EMAIL} if you would like to renew your license.`,
			])
		}
		return isExpired
	}

	private isPerpetualLicenseExpired(expiryDate: Date) {
		const expiration = this.getExpirationDateWithGracePeriod(expiryDate)
		const dates = {
			major: new Date(publishDates.major),
			minor: new Date(publishDates.minor),
		}
		// We allow patch releases, but the major and minor releases should be within the expiration date
		return dates.major >= expiration || dates.minor >= expiration
	}

	private isFlagEnabled(flags: number, flag: number) {
		return (flags & flag) === flag
	}

	private outputNoLicenseKeyProvided() {
		// Noop, we don't need to show this message.
		// this.outputMessages([
		// 	'No tldraw license key provided!',
		// 	`Please reach out to ${LICENSE_EMAIL} if you would like to license tldraw or if you'd like a trial.`,
		// ])
	}

	private outputInvalidLicenseKey(msg: string) {
		this.outputMessages(['Invalid tldraw license key', `Reason: ${msg}`])
	}

	private outputLicenseInfoIfNeeded(result: ValidLicenseKeyResult) {
		if (result.isAnnualLicenseExpired) {
			this.outputMessages([
				'Your tldraw license has expired!',
				`Please reach out to ${LICENSE_EMAIL} to renew.`,
			])
		}

		if (!result.isDomainValid && !result.isDevelopment) {
			this.outputMessages([
				'This tldraw license key is not valid for this domain!',
				`Please reach out to ${LICENSE_EMAIL} if you would like to use tldraw on other domains.`,
			])
		}
		// If we added a new flag it will be twice the value of the currently highest flag.
		// And if all the current flags are on we would get the `HIGHEST_FLAG * 2 - 1`, so anything higher than that means there are new flags.
		if (result.license.flags >= HIGHEST_FLAG * 2) {
			this.outputMessages([
				'This tldraw license contains some unknown flags.',
				'You may want to update tldraw packages to a newer version to get access to new functionality.',
			])
		}
	}

	private outputMessages(messages: string[]) {
		if (this.isTest) return
		if (this.verbose) {
			this.outputDelimiter()
			for (const message of messages) {
				// eslint-disable-next-line no-console
				console.log(
					`%c${message}`,
					`color: white; background: crimson; padding: 2px; border-radius: 3px;`
				)
			}
			this.outputDelimiter()
		}
	}

	private outputDelimiter() {
		// eslint-disable-next-line no-console
		console.log(
			'%c-------------------------------------------------------------------',
			`color: white; background: crimson; padding: 2px; border-radius: 3px;`
		)
	}

	static className = 'tl-watermark_SEE-LICENSE'
}

export function isEditorUnlicensed(result: LicenseFromKeyResult) {
	if (!result.isLicenseParseable) return true
	if (!result.isDomainValid && !result.isDevelopment) return true
	if (result.isPerpetualLicenseExpired || result.isAnnualLicenseExpired) {
		if (result.isInternalLicense) {
			throw new Error('License: Internal license expired.')
		}
		return true
	}

	return false
}
