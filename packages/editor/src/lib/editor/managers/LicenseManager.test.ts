import { generateKeyPair, generateLicenseKey } from '../../utils/licensing'
import { LicenseManager } from './LicenseManager'

describe('LicenseManager', () => {
	it('Checks if a license key was provided', async () => {
		const licenseManager = new LicenseManager()
		const result = await licenseManager.getLicenseFromKey('')
		expect(result).toMatchObject({ isLicenseValid: false, reason: 'no-key-provided' })
	})
	it('Validates the license key', async () => {
		const keyPair = await generateKeyPair()
		const licenseManager = new LicenseManager(keyPair.publicKey)
		const invalidLicenseKey = await generateLicenseKey(
			JSON.stringify({
				expiryDate: 123456789,
				companyName: 'Test Company',
				validHosts: ['localhost'],
			}),
			keyPair
		)
		const result = await licenseManager.getLicenseFromKey(invalidLicenseKey)
		expect(result).toMatchObject({ isLicenseValid: false, reason: 'invalid-license-key' })
	})
	it('Checks if the license key has expired', async () => {
		const keyPair = await generateKeyPair()
		const licenseManager = new LicenseManager(keyPair.publicKey)
		const licenseInfo = {
			expiry: Date.now() - 1000,
			company: 'Test Company',
			hosts: ['localhost'],
		}
		const expiredLicenseKey = await generateLicenseKey(JSON.stringify(licenseInfo), keyPair)
		const result = await licenseManager.getLicenseFromKey(expiredLicenseKey)
		expect(result).toMatchObject({
			isLicenseValid: true,
			license: { ...licenseInfo },
			isDomainValid: true,
			isLicenseExpired: true,
		})
	})
	it.todo('It allows a grace period for expired licenses')
	it.todo('Checks versions and permissions')
	it.todo(
		'Perpetual license: it allows updating important security patches past the release version'
	)
	it.todo('Checks the environment')
	it.todo('Checks the host')
})
