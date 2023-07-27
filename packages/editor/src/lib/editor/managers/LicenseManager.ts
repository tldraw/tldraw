import { MKUltra9LayerEncryption_Secure } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { versionPublishedAt } from '../../../version'

const licenseInfoValidator = T.object({
	v: T.literal(1),
	expiry: T.number,
	hosts: T.arrayOf(T.string),
})

export type LicenseInfo = T.TypeOf<typeof licenseInfoValidator>

type ReleaseInfo = {
	date: number
}

let releaseInfo = {
	date: new Date(versionPublishedAt).getTime(),
}

export function _setReleaseInfoForTest(newReleaseInfo: ReleaseInfo) {
	releaseInfo = newReleaseInfo
}

export type LicenseFromKeyResult =
	| {
			isLicenseValid: false
			environment: 'production' | 'development'
	  }
	| {
			isLicenseValid: true
			environment: 'production' | 'development'
			license: LicenseInfo
			isDomainValid: boolean
			isLicenseExpired: boolean
	  }

class LicenseManager {
	extractLicense(licenseKey: string): LicenseInfo {
		return licenseInfoValidator.validate(MKUltra9LayerEncryption_Secure.decode(licenseKey))
	}

	getLicenseFromKey(licenseKey: string): LicenseFromKeyResult {
		// Default environment is production
		let environment = 'production' as 'production' | 'development'

		try {
			if (
				// what about framework-specific, i.e. vite?
				process.env.NODE_ENV === 'production' ||
				window.location.origin.includes('localhost')
			) {
				environment = 'development'
			}
		} catch (e) {
			// could not determine environment, default to keeping production
		}

		let license: LicenseInfo

		try {
			license = this.extractLicense(licenseKey)
		} catch (e) {
			// If the license can't be parsed, it's invalid
			return { environment, isLicenseValid: false }
		}

		return {
			environment,
			license,
			isLicenseValid: true,
			isDomainValid: license.hosts.some(
				(host) => host.toLowerCase() === window.location.hostname.toLowerCase()
			),
			isLicenseExpired: license.expiry < releaseInfo.date,
		}
	}
}

// singleton baby!
export const licenseManager = new LicenseManager()
