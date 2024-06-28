import { LicenseManager } from './LicenseManager'

describe('LicenseManager', () => {
	const licenseManager = new LicenseManager()

	it('Checks if a license key was provided', () => {
		const result = licenseManager.getLicenseFromKey('')
		expect(result).toMatchObject({ isLicenseParseable: false, reason: 'no-key-provided' })
	})
	/* it('Validates the license key', () => {
		const invalidLicenseKey = generateKey(
			JSON.stringify({
				expiryDate: 123456789,
				companyName: 'Test Company',
				validHosts: ['localhost'],
			})
		)
		const result = licenseManager.getLicenseFromKey(invalidLicenseKey)
		expect(result).toMatchObject({ isLicenseParseable: false, message: 'Invalid license key' })
	}) */
	it.todo('Checks if the license key has expired')
	it.todo('Checks versions and permissions')
	it.todo('Checks the environment')
	it.todo('Checks the host')
	it.todo('Checks the host with just *')
	it.todo('Checks the host with wildcard')
	it.todo('Allows localhost')
	it.todo('Checks for internal only')
	it.todo('Cleanses out valid keys that accidentally have zero-width characters or newlines')
})

/* function generateKey(msgStr: string) {
	if (!process.env.SECRET_KEY) throw new Error('No secret key provided')
	const secretKey = process.env.SECRET_KEY
	const s = util.decodeBase64(secretKey)
	const msg = util.decodeUTF8(msgStr)
	const signature = nacl.sign(msg, s)
	const signatureB64 = util.encodeBase64(signature)
	return signatureB64
} */
