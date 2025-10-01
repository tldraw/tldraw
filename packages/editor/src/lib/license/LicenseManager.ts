import { atom } from '@tldraw/state'
import { publishDates, version } from '../../version'
import { getDefaultCdnBaseUrl } from '../utils/assets'
import { importPublicKey, str2ab } from '../utils/licensing'

const GRACE_PERIOD_DAYS = 30

export const FLAGS = {
	// -- MUTUALLY EXCLUSIVE FLAGS --
	// Annual means the license expires after a time period, usually 1 year.
	ANNUAL_LICENSE: 1,
	// Perpetual means the license never expires up to the max supported version.
	PERPETUAL_LICENSE: 1 << 1,

	// -- ADDITIVE FLAGS --
	// Internal means the license is for internal use only.
	INTERNAL_LICENSE: 1 << 2,
	// Watermark means the product is watermarked.
	WITH_WATERMARK: 1 << 3,
	// Evaluation means the license is for evaluation purposes only.
	EVALUATION_LICENSE: 1 << 4,
	// Native means the license is for native apps which switches
	// on special-case logic.
	NATIVE_LICENSE: 1 << 5,
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
export type LicenseState =
	| 'pending' // License validation is in progress
	| 'licensed' // License is valid and active (no restrictions)
	| 'licensed-with-watermark' // License is valid but shows watermark (evaluation licenses, WITH_WATERMARK licenses)
	| 'unlicensed' // No valid license found or license is invalid (development)
	| 'unlicensed-production' // No valid license in production deployment (missing, invalid, or wrong domain)
	| 'expired' // License has been expired (30 days past expiration for regular licenses, immediately for evaluation licenses)
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
	isNativeLicense: boolean
	isLicensedWithWatermark: boolean
	isEvaluationLicense: boolean
	isEvaluationLicenseExpired: boolean
	daysSinceExpiry: number
}

/** @internal */
export type TrackType = 'unlicensed' | 'with_watermark' | 'evaluation' | null

/** @internal */
export class LicenseManager {
	private publicKey =
		'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEHJh0uUfxHtCGyerXmmatE368Hd9rI6LH9oPDQihnaCryRFWEVeOvf9U/SPbyxX74LFyJs5tYeAHq5Nc0Ax25LQ'
	public isDevelopment: boolean
	public isTest: boolean
	public isCryptoAvailable: boolean
	state = atom<LicenseState>('license state', 'pending')
	public verbose = true

	constructor(licenseKey: string | undefined, testPublicKey?: string) {
		this.isTest = process.env.NODE_ENV === 'test'
		this.isDevelopment = this.getIsDevelopment()
		this.publicKey = testPublicKey || this.publicKey
		this.isCryptoAvailable = !!crypto.subtle

		this.getLicenseFromKey(licenseKey)
			.then((result) => {
				const licenseState = getLicenseState(
					result,
					(messages: string[]) => this.outputMessages(messages),
					this.isDevelopment
				)

				this.maybeTrack(result, licenseState)

				this.state.set(licenseState)
			})
			.catch((error) => {
				console.error('License validation failed:', error)
				this.state.set('unlicensed')
			})
	}

	private getIsDevelopment() {
		// If we are using https on a non-localhost domain we assume it's a production env and a development one otherwise
		return (
			!['https:', 'vscode-webview:'].includes(window.location.protocol) ||
			window.location.hostname === 'localhost' ||
			process.env.NODE_ENV !== 'production'
		)
	}

	private getTrackType(result: LicenseFromKeyResult, licenseState: LicenseState): TrackType {
		// Track watermark for unlicensed production deployments
		if (licenseState === 'unlicensed-production') {
			return 'unlicensed'
		}

		if (this.isDevelopment) {
			return null
		}

		if (!result.isLicenseParseable) {
			return null
		}

		// Track evaluation licenses (for analytics, even though no watermark is shown)
		if (result.isEvaluationLicense) {
			return 'evaluation'
		}

		// Track licenses that show watermarks
		if (licenseState === 'licensed-with-watermark') {
			return 'with_watermark'
		}

		return null
	}

	private maybeTrack(result: LicenseFromKeyResult, licenseState: LicenseState): void {
		const trackType = this.getTrackType(result, licenseState)
		if (!trackType) {
			return
		}

		const url = new URL(WATERMARK_TRACK_SRC)
		url.searchParams.set('version', version)
		url.searchParams.set('license_type', trackType)
		if ('license' in result) {
			url.searchParams.set('license_id', result.license.id)
		}
		if (process.env.NODE_ENV) {
			url.searchParams.set('environment', process.env.NODE_ENV)
		}

		// eslint-disable-next-line no-restricted-globals
		fetch(url.toString())
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
		} catch {
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

			const isEvaluationLicense = this.isFlagEnabled(licenseInfo.flags, FLAGS.EVALUATION_LICENSE)
			const daysSinceExpiry = this.getDaysSinceExpiry(expiryDate)

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
				isNativeLicense: this.isNativeLicense(licenseInfo),
				isLicensedWithWatermark: this.isFlagEnabled(licenseInfo.flags, FLAGS.WITH_WATERMARK),
				isEvaluationLicense,
				isEvaluationLicenseExpired:
					isEvaluationLicense && this.isEvaluationLicenseExpired(expiryDate),
				daysSinceExpiry,
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
			const normalizedHostOrUrlRegex = host.toLowerCase().trim()

			// Allow the domain if listed and www variations, 'example.com' allows 'example.com' and 'www.example.com'
			if (
				normalizedHostOrUrlRegex === currentHostname ||
				`www.${normalizedHostOrUrlRegex}` === currentHostname ||
				normalizedHostOrUrlRegex === `www.${currentHostname}`
			) {
				return true
			}

			// If host is '*', we allow all domains.
			if (host === '*') {
				// All domains allowed.
				return true
			}

			// Native license support
			// In this case, `normalizedHost` is actually a protocol, e.g. `app-bundle:`
			if (this.isNativeLicense(licenseInfo)) {
				return new RegExp(normalizedHostOrUrlRegex).test(window.location.href)
			}

			// Glob testing, we only support '*.somedomain.com' right now.
			if (host.includes('*')) {
				const globToRegex = new RegExp(host.replace(/\*/g, '.*?'))
				return globToRegex.test(currentHostname) || globToRegex.test(`www.${currentHostname}`)
			}

			// VSCode support
			if (window.location.protocol === 'vscode-webview:') {
				const currentUrl = new URL(window.location.href)
				const extensionId = currentUrl.searchParams.get('extensionId')
				if (normalizedHostOrUrlRegex === extensionId) {
					return true
				}
			}

			return false
		})
	}

	private isNativeLicense(licenseInfo: LicenseInfo) {
		return this.isFlagEnabled(licenseInfo.flags, FLAGS.NATIVE_LICENSE)
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
		return new Date() >= expiration
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

	private getDaysSinceExpiry(expiryDate: Date): number {
		const now = new Date()
		const expiration = this.getExpirationDateWithoutGracePeriod(expiryDate)
		const diffTime = now.getTime() - expiration.getTime()
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
		return Math.max(0, diffDays)
	}

	private isEvaluationLicenseExpired(expiryDate: Date): boolean {
		// Evaluation licenses have no grace period - they expire immediately
		const now = new Date()
		const expiration = this.getExpirationDateWithoutGracePeriod(expiryDate)
		return now >= expiration
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
		// If we added a new flag it will be twice the value of the currently highest flag.
		// And if all the current flags are on we would get the `HIGHEST_FLAG * 2 - 1`, so anything higher than that means there are new flags.
		if (result.license.flags >= HIGHEST_FLAG * 2) {
			this.outputMessages(
				[
					'Warning: This tldraw license contains some unknown flags.',
					'This will still work, however, you may want to update tldraw packages to a newer version to get access to new functionality.',
				],
				'warning'
			)
		}
	}

	private outputMessages(messages: string[], type: 'warning' | 'error' = 'error') {
		if (this.isTest) return
		if (this.verbose) {
			this.outputDelimiter()
			for (const message of messages) {
				const color = type === 'warning' ? 'orange' : 'crimson'
				const bgColor = type === 'warning' ? 'orange' : 'crimson'
				// eslint-disable-next-line no-console
				console.log(
					`%c${message}`,
					`color: ${color}; background: ${bgColor}; padding: 2px; border-radius: 3px;`
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

export function getLicenseState(
	result: LicenseFromKeyResult,
	outputMessages: (messages: string[]) => void,
	isDevelopment: boolean
): LicenseState {
	if (!result.isLicenseParseable) {
		if (isDevelopment) {
			return 'unlicensed'
		}

		// All unlicensed scenarios should not work in production
		if (result.reason === 'no-key-provided') {
			outputMessages([
				'No tldraw license key provided!',
				'A license is required for production deployments.',
				`Please reach out to ${LICENSE_EMAIL} to purchase a license.`,
			])
		} else {
			outputMessages([
				'Invalid license key. tldraw requires a valid license for production use.',
				`Please reach out to ${LICENSE_EMAIL} to purchase a license.`,
			])
		}
		return 'unlicensed-production'
	}

	if (!result.isDomainValid && !result.isDevelopment) {
		outputMessages([
			'License key is not valid for this domain.',
			'A license is required for production deployments.',
			`Please reach out to ${LICENSE_EMAIL} to purchase a license.`,
		])
		return 'unlicensed-production'
	}

	// Handle evaluation licenses - they expire immediately with no grace period
	if (result.isEvaluationLicense) {
		if (result.isEvaluationLicenseExpired) {
			outputMessages([
				'Your tldraw evaluation license has expired!',
				`Please reach out to ${LICENSE_EMAIL} to purchase a full license.`,
			])
			return 'expired'
		} else {
			// Valid evaluation license - tracked but no watermark shown
			return 'licensed'
		}
	}

	// Handle expired regular licenses (both annual and perpetual)
	if (result.isPerpetualLicenseExpired || result.isAnnualLicenseExpired) {
		outputMessages([
			'Your tldraw license has been expired for more than 30 days!',
			`Please reach out to ${LICENSE_EMAIL} to renew your license.`,
		])
		return 'expired'
	}

	// Check if license is past expiry date but within grace period
	const daysSinceExpiry = result.daysSinceExpiry
	if (daysSinceExpiry > 0 && !result.isEvaluationLicense) {
		outputMessages([
			'Your tldraw license has expired.',
			`License expired ${daysSinceExpiry} days ago.`,
			`Please reach out to ${LICENSE_EMAIL} to renew your license.`,
		])
		// Within 30-day grace period: still licensed (no watermark)
		return 'licensed'
	}

	// License is valid, determine if it has watermark
	if (result.isLicensedWithWatermark) {
		return 'licensed-with-watermark'
	}

	return 'licensed'
}
