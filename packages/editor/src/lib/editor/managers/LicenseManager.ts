import { T } from '@tldraw/validate'
import nacl from 'tweetnacl'
import util from 'tweetnacl-util'

const licenseInfoValidator = T.object({
	expiry: T.number,
	company: T.string,
	hosts: T.arrayOf(T.string),
})

export type LicenseInfo = T.TypeOf<typeof licenseInfoValidator>
export type InvalidLicense = 'InvalidLicenseKey' | 'NoLicenseKeyProvided'

export type LicenseFromKeyResult =
	| {
			isLicenseValid: false
			reason: InvalidLicense
	  }
	| {
			isLicenseValid: true
			license: LicenseInfo
			isDomainValid: boolean
			isLicenseExpired: boolean
	  }

export class LicenseManager {
	private publicKey = '3UylteUjvvOL4nKfN8KfjnTbSm6ayj23QihX9TsWPIM='
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
			return { isLicenseValid: false, reason: 'NoLicenseKeyProvided' }
		}

		try {
			const licenseInfo = this.extractLicense(licenseKey)
			return {
				license: licenseInfo,
				isLicenseValid: true,
				isDomainValid: licenseInfo.hosts.some(
					(host) => host.toLowerCase() === window.location.hostname.toLowerCase()
				),
				isLicenseExpired: licenseInfo.expiry > Date.now(),
			}
		} catch (e) {
			// If the license can't be parsed, it's invalid
			return { isLicenseValid: false, reason: 'InvalidLicenseKey' }
		}
	}
}
