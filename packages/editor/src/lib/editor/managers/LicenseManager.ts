import { IMPORT_META_ENV_MODE } from '../../../importMeta'
import { publishDates } from '../../../version'
import { importPublicKey, str2ab } from '../../utils/licensing'

const GRACE_PERIOD_DAYS = 5

export const FLAGS = {
	ANNUAL_LICENSE: 0x1,
	PERPETUAL_LICENSE: 0x2,
	INTERNAL_LICENSE: 0x4,
}
const HIGHEST_FLAG = Math.max(...Object.values(FLAGS))

const PROPERTIES = {
	ID: 0,
	HOSTS: 1,
	FLAGS: 2,
	VERSION: 3,
	EXPIRY_DATE: 4,
}
const NUMBER_OF_KNOWN_PROPERTIES = Object.keys(PROPERTIES).length

const LICENSE_EMAIL = 'sales@tldraw.com'

interface LicenseInfo {
	id: string
	hosts: string[]
	flags: number
	version: string
	expiryDate: string
}
type InvalidLicenseReason = 'invalid-license-key' | 'no-key-provided' | 'has-key-development-mode'

export type LicenseFromKeyResult = InvalidLicenseKeyResult | ValidLicenseKeyResult

interface InvalidLicenseKeyResult {
	isLicenseParseable: false
	reason: InvalidLicenseReason
}

export interface ValidLicenseKeyResult {
	isLicenseParseable: true
	license: LicenseInfo
	isDomainValid: boolean
	expiryDate: Date
	isAnnualLicense: boolean
	isAnnualLicenseExpired: boolean
	isPerpetualLicense: boolean
	isPerpetualLicenseExpired: boolean
	isInternalLicense: boolean
}

type TestEnvironment = 'development' | 'production'

export class LicenseManager {
	private publicKey =
		'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEHJh0uUfxHtCGyerXmmatE368Hd9rI6LH9oPDQihnaCryRFWEVeOvf9U/SPbyxX74LFyJs5tYeAHq5Nc0Ax25LQ=='
	public isDevelopment: boolean

	constructor(testPublicKey?: string, testEnvironment?: TestEnvironment) {
		this.isDevelopment = this.getIsDevelopment(testEnvironment)
		this.publicKey = testPublicKey || this.publicKey
	}

	private getIsDevelopment(testEnvironment?: TestEnvironment) {
		if (testEnvironment === 'development') {
			return true
		} else if (testEnvironment === 'production') {
			return false
		}
		if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
			return true
		}
		if (IMPORT_META_ENV_MODE === 'development') {
			return true
		}
		return window.location.protocol === 'http:'
	}

	private async extractLicenseKey(licenseKey: string): Promise<LicenseInfo> {
		// eslint-disable-next-line
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
			version: decodedData[PROPERTIES.VERSION],
			expiryDate: decodedData[PROPERTIES.EXPIRY_DATE],
		}
	}

	async getLicenseFromKey(licenseKey?: string): Promise<LicenseFromKeyResult> {
		if (!licenseKey) {
			this.outputNoLicenseKeyProvided()
			return { isLicenseParseable: false, reason: 'no-key-provided' }
		}

		if (this.isDevelopment) {
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
				isDomainValid: this.isDomainValid(licenseInfo),
				expiryDate,
				isAnnualLicense,
				isAnnualLicenseExpired: isAnnualLicense && this.isAnnualLicenseExpired(expiryDate),
				isPerpetualLicense,
				isPerpetualLicenseExpired: isPerpetualLicense && this.isPerpetualLicenseExpired(expiryDate),
				isInternalLicense: this.isFlagEnabled(licenseInfo.flags, FLAGS.INTERNAL_LICENSE),
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

		if (['localhost', '127.0.0.1'].includes(currentHostname)) {
			return true
		}

		return licenseInfo.hosts.some((host) => {
			const normalizedHost = host.toLowerCase().trim()
			if (normalizedHost === currentHostname) {
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
				return globToRegex.test(host)
			}

			return false
		})
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

	private isFlagEnabled(flags: number, flag: number) {
		return (flags & flag) === flag
	}

	private outputNoLicenseKeyProvided() {
		this.outputMessages([
			'No tldraw license key provided!',
			`Please reach out to ${LICENSE_EMAIL} if you would like to license tldraw or if you'd like a trial.`,
		])
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

		if (!result.isDomainValid) {
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

	private outputMessage(message: string) {
		this.outputMessages([message])
	}

	private outputMessages(messages: string[]) {
		if (!this.isDevelopment) return

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

	private outputDelimiter() {
		// eslint-disable-next-line no-console
		console.log(
			'%c-------------------------------------------------------------------',
			`color: white; background: crimson; padding: 2px; border-radius: 3px;`
		)
	}
}
