import { T } from '@tldraw/validate'
import nacl from 'tweetnacl'
import util from 'tweetnacl-util'

const licenseInfoValidator = T.object({
	expiry: T.number,
	company: T.string,
	hosts: T.arrayOf(T.string),
})

export type LicenseInfo = T.TypeOf<typeof licenseInfoValidator>

export type LicenseFromKeyResult =
	| {
			isLicenseValid: false
	  }
	| {
			isLicenseValid: true
			license: LicenseInfo
			isDomainValid: boolean
			isLicenseExpired: boolean
	  }

export class LicenseManager {
	private publicKey = '3UylteUjvvOL4nKfN8KfjnTbSm6ayj23QihX9TsWPIM='
	extractLicense(licenseKey: string): LicenseInfo {
		const base64License = util.decodeBase64(licenseKey)
		console.log('licenseKey', licenseKey)
		console.log('base64License', base64License)
		const decoded = nacl.sign.open(base64License, util.decodeBase64(this.publicKey))
		console.log('decoded', decoded)
		if (!decoded) {
			throw new Error('Invalid license')
		}
		const licenseInfo = JSON.parse(util.encodeUTF8(decoded))
		console.log('licenseInfo', licenseInfo)

		return licenseInfoValidator.validate(licenseInfo)
	}

	getLicenseFromKey(licenseKey?: string): LicenseFromKeyResult {
		if (!licenseKey) {
			return { isLicenseValid: false }
		}
		let license: LicenseInfo

		try {
			license = this.extractLicense(licenseKey)
		} catch (e) {
			// If the license can't be parsed, it's invalid
			return { isLicenseValid: false }
		}

		return {
			license,
			isLicenseValid: true,
			isDomainValid: license.hosts.some(
				(host) => host.toLowerCase() === window.location.hostname.toLowerCase()
			),
			isLicenseExpired: license.expiry > Date.now(),
		}
	}
}
