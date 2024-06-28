import { T } from '@tldraw/validate'
import nacl from 'tweetnacl'
import util from 'tweetnacl-util'

const LICENSE_EMAIL = 'sales@tldraw.com'
const LICENSE_ENV_TYPE = new Set(['prod', 'dev'] as const)

const FLAG_ANNUAL_LICENSE = 0x1
const FLAG_PERPETUAL_LICENSE = 0x2
const FLAG_INTERNAL_ONLY = 0x4

const licenseInfoValidator = T.object({
	id: T.string,
	env: T.setEnum(LICENSE_ENV_TYPE),
	hosts: T.arrayOf(T.string),
	customerId: T.string,
	flags: T.number,
	versionNumber: T.string,
	expiryDate: T.number,
	gracePeriod: T.number,
})

export type LicenseInfo = T.TypeOf<typeof licenseInfoValidator>
export type InvalidLicenseReason = 'invalid-license-key' | 'no-key-provided'

export type LicenseFromKeyResult = InvalidLicenseKeyResult | ValidLicenseKeyResult

interface InvalidLicenseKeyResult {
	isLicenseParseable: false
	reason: InvalidLicenseReason
}

interface ValidLicenseKeyResult {
	isLicenseParseable: true
	license: LicenseInfo
	isDevelopmentKey: boolean
	isDomainValid: boolean
	isAnnualLicense: boolean
	isPerpetualLicense: boolean
	isInternalOnly: boolean
	isLicenseExpired: boolean
}

export class LicenseManager {
	private publicKey =
		'-----BEGIN PUBLIC KEY-----\nMHYwEAYHKoZIzj0CAQYFK4EEACIDYgAEPkmEjocP8ldvaSv6BZuhhl+KgrBPn15eckpnYTtVGyqUngQnqdca/4BdZuCwxBR84cvE0MDQ/VnOu/Fyh+K2xr/uewxKqp9OaqqsGnedNdi4ypMZEnWIZkH32wn5BP6W\n-----END PUBLIC KEY-----'

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
			return { isLicenseParseable: false, reason: 'no-key-provided' }
		}

		// Borrowed idea from AG Grid:
		// Copying from various sources (like PDFs) can include zero-width characters.
		// This helps makes sure the key validation doesn't fail.
		let cleanedLicenseKey = licenseKey.replace(/[\u200B-\u200D\uFEFF]/g, '')
		cleanedLicenseKey = cleanedLicenseKey.replace(/\r?\n|\r/g, '')

		try {
			const licenseInfo = this.extractLicense(cleanedLicenseKey)
			const result: ValidLicenseKeyResult = {
				license: licenseInfo,
				isLicenseParseable: true,
				isDevelopmentKey: licenseInfo.env === 'dev',
				isDomainValid: this.isDomainValid(licenseInfo),
				isAnnualLicense: !!(licenseInfo.flags & FLAG_ANNUAL_LICENSE),
				isPerpetualLicense: !!(licenseInfo.flags & FLAG_PERPETUAL_LICENSE),
				isInternalOnly: !!(licenseInfo.flags & FLAG_INTERNAL_ONLY),
				// TODO: add grace period and one day fuzz for timezone
				isLicenseExpired: licenseInfo.expiryDate > Date.now(),
			}
			this.outputLicenseInfoIfNeeded(result)

			return result
		} catch (e) {
			this.outputInvalidLicenseKey()
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

	private outputNoLicenseKeyProvided() {
		this.outputMessages([
			'No tldraw license key provided!',
			`Please reach out to ${LICENSE_EMAIL} if you would like to license tldraw or if you'd like a trial.`,
		])
	}

	private outputInvalidLicenseKey() {
		this.outputMessage('Invalid tldraw license key.')
	}

	private outputLicenseInfoIfNeeded(result: ValidLicenseKeyResult) {
		if (result.isLicenseExpired) {
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
	}

	private outputMessage(message: string) {
		this.outputMessages([message])
	}

	private outputMessages(messages: string[]) {
		if (this.isTest) return

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
