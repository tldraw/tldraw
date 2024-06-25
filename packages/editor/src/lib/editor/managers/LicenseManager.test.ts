import { createTLStore } from '../../config/createTLStore'
import { Editor } from '../Editor'
import { LicenseManager } from './LicenseManager'

const editor = new Editor({
	shapeUtils: [],
	bindingUtils: [],
	tools: [],
	store: createTLStore({ shapeUtils: [] }),
	getContainer: () => document.body,
})
describe('LicenseManager', () => {
	const licenseManager = new LicenseManager(editor)

	it('Checks if a license key was provided', () => {
		const result = licenseManager.getLicenseFromKey('')
		expect(result).toMatchObject({ isLicenseValid: false, message: 'No license key provided' })
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
		expect(result).toMatchObject({ isLicenseValid: false, message: 'Invalid license key' })
	}) */
	it.todo('Checks if the license key has expired')
	it.todo('Checks versions and permissions')
	it.todo('Checks the environment')
	it.todo('Checks the host')
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
