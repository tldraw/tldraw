import { MKUltra9LayerEncryption_Secure } from '@tldraw/utils'
import { LicenseInfo, _setReleaseInfoForTest, licenseManager } from './LicenseManager'

function makeLicenseKey(info: LicenseInfo) {
	return MKUltra9LayerEncryption_Secure.encode(info)
}

describe('LicenseManager', () => {
	it('extracts the license from the key', () => {
		const license: LicenseInfo = {
			v: 1,
			expiry: new Date('01/01/2023, 00:00:00').getTime(),
			hosts: ['tldraw.com', 'staging.tldraw.com'],
		}
		const key = MKUltra9LayerEncryption_Secure.encode(license)
		expect(licenseManager.extractLicense(key)).toEqual(license)
	})

	it('produces the correct result from the key', () => {
		_setReleaseInfoForTest({
			date: new Date('01/01/2023, 00:00:00').getTime(),
		})

		const key = makeLicenseKey({
			v: 1,
			expiry: new Date('01/01/2023, 00:00:00').getTime(),
			hosts: ['tldraw.com', 'staging.tldraw.com'],
		})

		expect(licenseManager.getLicenseFromKey(key)).toEqual({
			environment: 'development',
			isLicenseValid: true,
			isLicenseExpired: false,
			isDomainValid: false,
			license: {
				v: 1,
				expiry: new Date('01/01/2023, 00:00:00').getTime(),
				hosts: ['tldraw.com', 'staging.tldraw.com'],
			},
		})
	})

	it('when key is malformed', () => {
		_setReleaseInfoForTest({
			date: new Date('01/01/2023, 00:00:00').getTime(),
		})

		expect(licenseManager.getLicenseFromKey('abc123')).toEqual({
			environment: 'development',
			isLicenseValid: false,
		})
	})

	it('when everything is ok', () => {
		_setReleaseInfoForTest({
			date: new Date('01/01/2023, 00:00:00').getTime(),
		})

		const license: LicenseInfo = {
			v: 1,
			expiry: new Date('01/01/2023, 00:00:00').getTime(),
			hosts: ['tldraw.com', 'staging.tldraw.com'],
		}
		const key = makeLicenseKey(license)

		expect(licenseManager.getLicenseFromKey(key)).toEqual({
			environment: 'development',
			isLicenseValid: true,
			isLicenseExpired: false,
			isDomainValid: false,
			license,
		})
	})

	it('when license is expired', () => {
		_setReleaseInfoForTest({
			date: new Date('01/01/2023, 00:00:00').getTime(),
		})

		const license: LicenseInfo = {
			v: 1,
			expiry: new Date('01/01/2022, 00:00:00').getTime(),
			hosts: ['tldraw.com', 'staging.tldraw.com'],
		}
		const key = makeLicenseKey(license)

		expect(licenseManager.getLicenseFromKey(key)).toEqual({
			environment: 'development',
			isLicenseValid: true,
			isLicenseExpired: true,
			isDomainValid: false,
			license,
		})
	})

	it('when origin is production and origin is valid', () => {
		_setReleaseInfoForTest({
			date: new Date('01/01/2023, 00:00:00').getTime(),
		})

		const location = new URL('https://tldraw.com') as any
		location.assign = jest.fn()
		location.replace = jest.fn()
		location.reload = jest.fn()

		// @ts-expect-error
		delete window.location
		window.location = location

		const license: LicenseInfo = {
			v: 1,
			expiry: new Date('01/01/2023, 00:00:00').getTime(),
			hosts: ['tldraw.com', 'staging.tldraw.com'],
		}
		const key = makeLicenseKey(license)

		expect(licenseManager.getLicenseFromKey(key)).toEqual({
			environment: 'production',
			isLicenseValid: true,
			isLicenseExpired: false,
			isDomainValid: true,
			license,
		})
	})

	it('when origin is production and origin is invalid', () => {
		_setReleaseInfoForTest({
			date: new Date('01/01/2023, 00:00:00').getTime(),
		})

		const location = new URL('https://www.aol.com') as any
		location.assign = jest.fn()
		location.replace = jest.fn()
		location.reload = jest.fn()

		// @ts-expect-error
		delete window.location
		window.location = location

		const license: LicenseInfo = {
			v: 1,
			expiry: new Date('01/01/2023, 00:00:00').getTime(),
			hosts: ['tldraw.com', 'staging.tldraw.com'],
		}
		const key = makeLicenseKey(license)

		expect(licenseManager.getLicenseFromKey(key)).toEqual({
			environment: 'production',
			isLicenseValid: true,
			isLicenseExpired: false,
			isDomainValid: false,
			license,
		})
	})
})
