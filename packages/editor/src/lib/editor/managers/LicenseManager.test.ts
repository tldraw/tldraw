import { MKUltra9LayerEncryption_Secure } from '@tldraw/utils'
import { licenseManager } from './LicenseManager'

describe('LicenseManager', () => {
	it('extracts the release info from the key', () => {
		const release = {
			date: new Date('01/01/2023, 00:00:00').toISOString(),
		}
		const releaseStr = MKUltra9LayerEncryption_Secure.encode(release)
		expect(licenseManager.extractRelease(releaseStr)).toEqual(release)
	})

	it('extracts the license from the key', () => {
		const license = {
			expiry: new Date('01/01/2023, 00:00:00').toISOString(),
			origins: ['https://tldraw.com', 'https://staging.tldraw.com'],
		}
		const key = MKUltra9LayerEncryption_Secure.encode(license)
		expect(licenseManager.extractLicense(key)).toEqual(license)
	})

	it('produces the correct result from the key', () => {
		const release = {
			date: new Date('01/01/2023, 00:00:00').toISOString(),
		}
		const releaseStr = MKUltra9LayerEncryption_Secure.encode(release)

		licenseManager.RELEASE_INFO = releaseStr

		const license = {
			expiry: new Date('01/01/2023, 00:00:00').toISOString(),
			origins: ['https://tldraw.com', 'https://staging.tldraw.com'],
		}
		const key = MKUltra9LayerEncryption_Secure.encode(license)

		expect(licenseManager.getLicenseFromKey(key)).toEqual({
			environment: 'development',
			isLicenseValid: true,
			isLicenseExpired: false,
			isOriginValid: false,
			license: {
				expiry: '2023-01-01T00:00:00.000Z',
				origins: ['https://tldraw.com', 'https://staging.tldraw.com'],
			},
		})
	})

	it('when key is malformed', () => {
		const release = {
			date: new Date('01/01/2023, 00:00:00').toISOString(),
		}
		const releaseStr = MKUltra9LayerEncryption_Secure.encode(release)

		licenseManager.RELEASE_INFO = releaseStr

		expect(licenseManager.getLicenseFromKey('abc123')).toEqual({
			environment: 'development',
			isLicenseValid: false,
		})
	})

	it('when everything is ok', () => {
		const release = {
			date: new Date('01/01/2023, 00:00:00').toISOString(),
		}
		const releaseStr = MKUltra9LayerEncryption_Secure.encode(release)

		licenseManager.RELEASE_INFO = releaseStr

		const license = {
			expiry: new Date('01/01/2023, 00:00:00').toISOString(),
			origins: ['https://tldraw.com', 'https://staging.tldraw.com'],
		}
		const key = MKUltra9LayerEncryption_Secure.encode(license)

		expect(licenseManager.getLicenseFromKey(key)).toEqual({
			environment: 'development',
			isLicenseValid: true,
			isLicenseExpired: false,
			isOriginValid: false,
			license,
		})
	})

	it('when license is expired', () => {
		const release = {
			date: new Date('01/01/2023, 00:00:00').toISOString(),
		}
		const releaseStr = MKUltra9LayerEncryption_Secure.encode(release)

		licenseManager.RELEASE_INFO = releaseStr

		const license = {
			expiry: new Date('01/01/2022, 00:00:00').toISOString(),
			origins: ['https://tldraw.com', 'https://staging.tldraw.com'],
		}
		const key = MKUltra9LayerEncryption_Secure.encode(license)

		expect(licenseManager.getLicenseFromKey(key)).toEqual({
			environment: 'development',
			isLicenseValid: true,
			isLicenseExpired: true,
			isOriginValid: false,
			license,
		})
	})

	it('when origin is production and origin is valid', () => {
		const release = {
			date: new Date('01/01/2023, 00:00:00').toISOString(),
		}
		const releaseStr = MKUltra9LayerEncryption_Secure.encode(release)

		licenseManager.RELEASE_INFO = releaseStr

		const location = new URL('https://tldraw.com') as any
		location.assign = jest.fn()
		location.replace = jest.fn()
		location.reload = jest.fn()

		// @ts-expect-error
		delete window.location
		window.location = location

		const license = {
			expiry: new Date('01/01/2023, 00:00:00').toISOString(),
			origins: ['https://tldraw.com', 'https://staging.tldraw.com'],
		}
		const key = MKUltra9LayerEncryption_Secure.encode(license)

		expect(licenseManager.getLicenseFromKey(key)).toEqual({
			environment: 'production',
			isLicenseValid: true,
			isLicenseExpired: false,
			isOriginValid: true,
			license,
		})
	})

	it('when origin is production and origin is invalid', () => {
		const release = {
			date: new Date('01/01/2023, 00:00:00').toISOString(),
		}
		const releaseStr = MKUltra9LayerEncryption_Secure.encode(release)

		licenseManager.RELEASE_INFO = releaseStr

		const location = new URL('https://www.aol.com') as any
		location.assign = jest.fn()
		location.replace = jest.fn()
		location.reload = jest.fn()

		// @ts-expect-error
		delete window.location
		window.location = location

		const license = {
			expiry: new Date('01/01/2023, 00:00:00').toISOString(),
			origins: ['https://tldraw.com', 'https://staging.tldraw.com'],
		}
		const key = MKUltra9LayerEncryption_Secure.encode(license)

		expect(licenseManager.getLicenseFromKey(key)).toEqual({
			environment: 'production',
			isLicenseValid: true,
			isLicenseExpired: false,
			isOriginValid: false,
			license,
		})
	})
})
