import crypto from 'crypto'
import { str2ab } from '../../utils/licensing'
import { FLAGS, LicenseManager, ValidLicenseKeyResult } from './LicenseManager'

jest.mock('../../../importMeta.ts', () => ({
	IMPORT_META_ENV_MODE: 'test',
}))

describe('LicenseManager', () => {
	let keyPair: { publicKey: string; privateKey: string }
	let licenseManager: LicenseManager

	beforeAll(() => {
		return new Promise((resolve) => {
			generateKeyPair().then((kp) => {
				keyPair = kp
				licenseManager = new LicenseManager(keyPair.publicKey, 'production')
				resolve(void 0)
			})
		})
	})

	it('Checks if a license key was provided', async () => {
		const result = await licenseManager.getLicenseFromKey('')
		expect(result).toMatchObject({ isLicenseParseable: false, reason: 'no-key-provided' })
	})

	it('Validates the license key', async () => {
		const invalidLicenseKey = await generateLicenseKey('asdfsad', keyPair)
		const result = await licenseManager.getLicenseFromKey(invalidLicenseKey)
		expect(result).toMatchObject({ isLicenseParseable: false, reason: 'invalid-license-key' })
	})

	it('Checks if the license key has expired', async () => {
		const now = new Date()
		const expiredDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())

		const licenseInfo = [
			'id',
			['localhost'],
			FLAGS.ANNUAL_LICENSE,
			'1.0',
			expiredDate.toISOString(),
		]
		const expiredLicenseKey = await generateLicenseKey(JSON.stringify(licenseInfo), keyPair)
		const result = await licenseManager.getLicenseFromKey(expiredLicenseKey)
		expect(result).toMatchObject({
			isLicenseParseable: true,
			license: {
				id: 'id',
				hosts: ['localhost'],
				flags: FLAGS.ANNUAL_LICENSE,
				version: '1.0',
				expiryDate: expiredDate.toISOString(),
			},
			isDomainValid: true,
			isAnnualLicense: true,
			isAnnualLicenseExpired: true,
			isPerpetualLicense: false,
			isPerpetualLicenseExpired: false,
			isInternalLicense: false,
		} as ValidLicenseKeyResult)
	})

	it.todo('It allows a grace period for expired licenses')

	it.todo('Checks versions and permissions')

	it.todo(
		'Perpetual license: it allows updating important security patches past the release version'
	)

	it.todo('Checks the environment')

	it.todo('Checks the host')
	it.todo('Checks the host with just *')
	it.todo('Checks the host with wildcard')
	it.todo('Allows localhost')
	it.todo('Checks for internal only')
	it.todo('Cleanses out valid keys that accidentally have zero-width characters or newlines')
})

async function generateLicenseKey(
	message: string,
	keyPair: { publicKey: string; privateKey: string }
) {
	const enc = new TextEncoder()
	const encodedMsg = enc.encode(message)
	const privateKey = await importPrivateKey(keyPair.privateKey)

	const signedLicenseKeyBuffer = await crypto.subtle.sign(
		{
			name: 'ECDSA',
			hash: { name: 'SHA-256' },
		},
		privateKey,
		encodedMsg
	)

	const signature = btoa(ab2str(signedLicenseKeyBuffer))
	const prefix = 'tldraw-'
	const licenseKey = `${prefix}/${btoa(message)}.${signature}`

	return licenseKey
}

/*
  Import a PEM encoded RSA private key, to use for RSA-PSS signing.
  Takes a string containing the PEM encoded key, and returns a Promise
  that will resolve to a CryptoKey representing the private key.
*/
function importPrivateKey(pemContents: string) {
	// base64 decode the string to get the binary data
	const binaryDerString = atob(pemContents)
	// convert from a binary string to an ArrayBuffer
	const binaryDer = str2ab(binaryDerString) as Uint8Array

	return crypto.subtle.importKey(
		'pkcs8',
		new Uint8Array(binaryDer),
		{
			name: 'ECDSA',
			namedCurve: 'P-256',
		},
		true,
		['sign']
	)
}

/*
  Generate a sign/verify key pair.
*/
async function generateKeyPair() {
	const keyPair = await crypto.subtle.generateKey(
		{
			name: 'ECDSA',
			namedCurve: 'P-256',
		},
		true,
		['sign', 'verify']
	)
	const publicKey = await exportCryptoKey(keyPair.publicKey, true /* isPublic */)
	const privateKey = await exportCryptoKey(keyPair.privateKey)

	return { publicKey, privateKey }
}

async function exportCryptoKey(key: CryptoKey, isPublic = false) {
	const exported = await crypto.subtle.exportKey(isPublic ? 'spki' : 'pkcs8', key)
	return btoa(ab2str(exported))
}

/*
  Convert an ArrayBuffer into a string
  from https://developer.chrome.com/blog/how-to-convert-arraybuffer-to-and-from-string/
*/
export function ab2str(buf: ArrayBuffer) {
	return String.fromCharCode.apply(null, new Uint8Array(buf) as unknown as number[])
}
