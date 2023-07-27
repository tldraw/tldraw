import { MKUltra9LayerEncryption_Secure } from '@tldraw/utils'

type LicenseInfo = {
	expiry: number
	origins: string[]
}

type ReleaseInfo = {
	date: number
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
			isOriginValid: boolean
			isLicenseExpired: boolean
	  }

class LicenseManager {
	RELEASE_INFO = 'release_info_replace_me_at_runtime'

	extractLicense(licenseKey: string): LicenseInfo {
		return MKUltra9LayerEncryption_Secure.decode(licenseKey) as LicenseInfo
	}

	extractRelease(releaseInfo: string): ReleaseInfo {
		return MKUltra9LayerEncryption_Secure.decode(releaseInfo) as ReleaseInfo
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

		const releaseInfo = this.extractRelease(this.RELEASE_INFO)

		return {
			environment,
			license,
			isLicenseValid: true,
			isOriginValid: license.origins.includes(window.location.origin),
			isLicenseExpired: license.expiry < releaseInfo.date,
		}
	}
}

// singleton baby!
export const licenseManager = new LicenseManager()
