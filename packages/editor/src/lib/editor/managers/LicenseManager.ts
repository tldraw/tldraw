import { T } from '@tldraw/validate'
import nacl from 'tweetnacl'
import util from 'tweetnacl-util'

const licenseInfoValidator = T.object({
	expiry: T.number,
	company: T.string,
	hosts: T.arrayOf(T.string),
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
	isLicenseExpired: boolean
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
			const result: ValidLicenseKeyResult = {
				license: licenseInfo,
				isLicenseValid: true,
				isDomainValid: licenseInfo.hosts.some(
					(host) => host.toLowerCase() === window.location.hostname.toLowerCase()
				),
				isLicenseExpired: licenseInfo.expiry > Date.now(),
			}
			this.outputLicenseInfoIfNeeded(result)
			return result
		} catch (e) {
			this.outputInvalidLicenseKey()
			// If the license can't be parsed, it's invalid
			return { isLicenseValid: false, reason: 'invalid-license-key' }
		}
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
		if (result.isLicenseExpired) {
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
