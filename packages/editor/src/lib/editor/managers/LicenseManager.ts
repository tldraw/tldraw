import { T } from '@tldraw/validate'
import nacl from 'tweetnacl'
import util from 'tweetnacl-util'
import { publishDates } from '../../../version'

const GRACE_PERIOD_DAYS = 5

const FLAGS = {
	annualLicense: 1,
	perpetualLicense: 2,
	internalLicense: 4,
}

const licenseInfoValidator = T.object({
	expiryDate: T.string,
	customer: T.string,
	validHosts: T.arrayOf(T.string),
	flags: T.number,
	env: T.literalEnum('Production', 'Development'),
})

export type LicenseInfo = T.TypeOf<typeof licenseInfoValidator>
export type InvalidLicenseReason = 'invalid-license-key' | 'no-key-provided'

export type LicenseFromKeyResult = InvalidLicenseKeyResult | ValidLicenseKeyResult

interface InvalidLicenseKeyResult {
	isLicenseValid: false
	reason: InvalidLicenseReason
}

interface ValidLicenseKeyResult {
	isLicenseValid: true
	license: LicenseInfo
	isDomainValid: boolean
	isAnnualLicenseExpired: boolean
	isPerpetualLicenseExpired: boolean
	expiryDate: Date
	isAnnualLicense: boolean
	isPerpetualLicense: boolean
	isInternalLicense: boolean
}

export class LicenseManager {
	private publicKey = '3UylteUjvvOL4nKfN8KfjnTbSm6ayj23QihX9TsWPIM='
	private isTest: boolean
	constructor() {
		this.isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test'
	}
	private extractLicense(licenseKey: string): LicenseInfo {
		const base64License = util.decodeBase64(licenseKey)

		const decoded = nacl.sign.open(base64License, util.decodeBase64(this.publicKey))

		if (!decoded) {
			throw new Error('Invalid license key')
		}
		const licenseInfo = JSON.parse(util.encodeUTF8(decoded))
		return licenseInfoValidator.validate(licenseInfo)
	}

	getLicenseFromKey(licenseKey?: string): LicenseFromKeyResult {
		if (!licenseKey) {
			this.outputNoLicenseKeyProvided()
			return { isLicenseValid: false, reason: 'no-key-provided' }
		}

		try {
			const licenseInfo = this.extractLicense(licenseKey)
			const expiryDate = new Date(licenseInfo.expiryDate)
			const isAnnualLicense = this.isFlagEnabled(licenseInfo.flags, FLAGS.annualLicense)
			const isPerpetualLicense = this.isFlagEnabled(licenseInfo.flags, FLAGS.perpetualLicense)

			const result: ValidLicenseKeyResult = {
				license: licenseInfo,
				isLicenseValid: true,
				isDomainValid: licenseInfo.validHosts.some(
					(host) => host.toLowerCase() === window.location.hostname.toLowerCase()
				),
				expiryDate,
				isAnnualLicenseExpired: isAnnualLicense && this.isAnnualLicenseExpired(expiryDate),
				isPerpetualLicenseExpired: isPerpetualLicense && this.isPerpetualLicenseExpired(expiryDate),
				isAnnualLicense,
				isPerpetualLicense,
				isInternalLicense: this.isFlagEnabled(licenseInfo.flags, FLAGS.internalLicense),
			}
			this.outputLicenseInfoIfNeeded(result)
			return result
		} catch (e) {
			this.outputInvalidLicenseKey()
			// If the license can't be parsed, it's invalid
			return { isLicenseValid: false, reason: 'invalid-license-key' }
		}
	}

	private isAnnualLicenseExpired(expiryDate: Date) {
		const expirationWithGracePeriod = new Date(
			expiryDate.getFullYear(),
			expiryDate.getMonth(),
			expiryDate.getDate() + GRACE_PERIOD_DAYS + 1 // Add 1 day to include the expiration day
		)
		return new Date() >= expirationWithGracePeriod
	}

	private isPerpetualLicenseExpired(expiryDate: Date) {
		const expiration = new Date(
			expiryDate.getFullYear(),
			expiryDate.getMonth(),
			expiryDate.getDate() + GRACE_PERIOD_DAYS + 1 // Add 1 day to include the expiration day
		)
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
			'No tldraw license key provided.',
			"Please reach out to hello@tldraw.com if you would like to license tldraw or if you'd like a trial.",
		])
	}

	private outputInvalidLicenseKey() {
		this.outputMessage('Invalid tldraw license key.')
	}

	private outputLicenseInfoIfNeeded(result: ValidLicenseKeyResult) {
		if (result.isAnnualLicenseExpired) {
			this.outputMessages([
				'Your tldraw license has expired.',
				'Please reach out to hello@tldraw.com to renew.',
			])
		}
		if (!result.isDomainValid) {
			this.outputMessages([
				'This tldraw license key is not valid for this domain.',
				'Please reach out to hello@tldraw.com if you would like to use tldraw on other domains.',
			])
		}
	}

	private outputMessage(message: string) {
		this.outputMessages([message])
	}

	private outputMessages(messages: string[]) {
		if (this.isTest) return
		this.outputDelimiter()
		for (const message of messages) {
			// eslint-disable-next-line no-console
			console.log(message)
		}
		this.outputDelimiter()
	}

	private outputDelimiter() {
		// eslint-disable-next-line no-console
		console.log('-------------------------------------------------------------------')
	}
}
