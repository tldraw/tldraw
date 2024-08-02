import crypto from 'crypto'
import { publishDates } from '../../version'
import { str2ab } from '../utils/licensing'
import {
	FLAGS,
	isEditorUnlicensed,
	LicenseManager,
	PROPERTIES,
	ValidLicenseKeyResult,
} from './LicenseManager'

jest.mock('../../version', () => {
	return {
		publishDates: {
			major: '2024-06-28T10:56:07.893Z',
			minor: '2024-07-02T16:49:50.397Z',
			patch: '2030-07-02T16:49:50.397Z',
		},
	}
})

const now = new Date()
const expiryDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5).toISOString()

const STANDARD_LICENSE_INFO = JSON.stringify([
	'id',
	['www.example.com'],
	FLAGS.ANNUAL_LICENSE,
	expiryDate,
])

describe('LicenseManager', () => {
	let keyPair: { publicKey: string; privateKey: string }
	let licenseManager: LicenseManager

	beforeAll(() => {
		return new Promise((resolve) => {
			generateKeyPair().then((kp) => {
				keyPair = kp
				licenseManager = new LicenseManager('', keyPair.publicKey, 'production')
				resolve(void 0)
			})
		})
	})

	beforeEach(() => {
		// @ts-ignore
		delete window.location
		// @ts-ignore
		window.location = new URL('https://www.example.com')
	})

	it('Fails if no key provided', async () => {
		const result = await licenseManager.getLicenseFromKey('')
		expect(result).toMatchObject({ isLicenseParseable: false, reason: 'no-key-provided' })
	})

	it('Signals that it is development mode when appropriate', async () => {
		// @ts-ignore
		delete window.location
		// @ts-ignore
		window.location = new URL('http://localhost:3000')

		const testEnvLicenseManager = new LicenseManager('', keyPair.publicKey, 'development')
		const licenseKey = await generateLicenseKey(STANDARD_LICENSE_INFO, keyPair)
		const result = await testEnvLicenseManager.getLicenseFromKey(licenseKey)
		expect(result).toMatchObject({
			isLicenseParseable: true,
			isDomainValid: false,
			isDevelopment: true,
		})
	})

	it('Cleanses out valid keys that accidentally have zero-width characters or newlines', async () => {
		const cleanLicenseKey = await generateLicenseKey(STANDARD_LICENSE_INFO, keyPair)
		const dirtyLicenseKey = cleanLicenseKey + '\u200B\u200D\uFEFF\n\r'
		const result = await licenseManager.getLicenseFromKey(dirtyLicenseKey)
		expect(result.isLicenseParseable).toBe(true)
	})

	it('Fails if garbage key provided', async () => {
		const badPublicKeyLicenseManager = new LicenseManager('', 'badpublickey', 'production')
		const invalidLicenseKey = await generateLicenseKey(STANDARD_LICENSE_INFO, keyPair)
		const result = await badPublicKeyLicenseManager.getLicenseFromKey(invalidLicenseKey)
		expect(result).toMatchObject({ isLicenseParseable: false, reason: 'invalid-license-key' })
	})

	it('Fails if non-JSON parseable message is provided', async () => {
		const invalidMessage = await generateLicenseKey('asdfsad', keyPair)
		const result = await licenseManager.getLicenseFromKey(invalidMessage)
		expect(result).toMatchObject({ isLicenseParseable: false, reason: 'invalid-license-key' })
	})

	it('Succeeds if valid key provided', async () => {
		const licenseKey = await generateLicenseKey(STANDARD_LICENSE_INFO, keyPair)
		const result = await licenseManager.getLicenseFromKey(licenseKey)
		expect(result).toMatchObject({
			isLicenseParseable: true,
			license: {
				id: 'id',
				hosts: ['www.example.com'],
				flags: FLAGS.ANNUAL_LICENSE,
				expiryDate,
			},
			isDomainValid: true,
			isAnnualLicense: true,
			isAnnualLicenseExpired: false,
			isPerpetualLicense: false,
			isPerpetualLicenseExpired: false,
			isInternalLicense: false,
		} as ValidLicenseKeyResult)
	})

	it('Fails if the license key has expired', async () => {
		const expiredLicenseInfo = JSON.parse(STANDARD_LICENSE_INFO)
		const expiryDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6) // 6 days ago
		expiredLicenseInfo[PROPERTIES.EXPIRY_DATE] = expiryDate
		const expiredLicenseKey = await generateLicenseKey(JSON.stringify(expiredLicenseInfo), keyPair)
		const result = (await licenseManager.getLicenseFromKey(
			expiredLicenseKey
		)) as ValidLicenseKeyResult
		expect(result.isAnnualLicenseExpired).toBe(true)
	})

	it('Allows a grace period for expired licenses', async () => {
		const almostExpiredLicenseInfo = JSON.parse(STANDARD_LICENSE_INFO)
		const expiryDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5) // 5 days ago
		almostExpiredLicenseInfo[PROPERTIES.EXPIRY_DATE] = expiryDate
		const almostExpiredLicenseKey = await generateLicenseKey(
			JSON.stringify(almostExpiredLicenseInfo),
			keyPair
		)
		const result = (await licenseManager.getLicenseFromKey(
			almostExpiredLicenseKey
		)) as ValidLicenseKeyResult
		expect(result.isAnnualLicenseExpired).toBe(false)
	})

	// We mock the patch version to be in 2030 above.
	it('Succeeds for perpetual license with correct version (and patch does not matter)', async () => {
		const majorDate = new Date(publishDates.major)
		const expiryDate = new Date(
			majorDate.getFullYear(),
			majorDate.getMonth(),
			majorDate.getDate() + 100
		)
		const perpetualLicenseInfo = ['id', ['www.example.com'], FLAGS.PERPETUAL_LICENSE, expiryDate]
		const almostExpiredLicenseKey = await generateLicenseKey(
			JSON.stringify(perpetualLicenseInfo),
			keyPair
		)
		const result = (await licenseManager.getLicenseFromKey(
			almostExpiredLicenseKey
		)) as ValidLicenseKeyResult
		expect(result.isPerpetualLicense).toBe(true)
		expect(result.isPerpetualLicenseExpired).toBe(false)
	})

	it('Fails for perpetual license past the release version', async () => {
		const majorDate = new Date(publishDates.major)
		const expiryDate = new Date(
			majorDate.getFullYear(),
			majorDate.getMonth(),
			majorDate.getDate() - 100
		)
		const perpetualLicenseInfo = ['id', ['www.example.com'], FLAGS.PERPETUAL_LICENSE, expiryDate]
		const almostExpiredLicenseKey = await generateLicenseKey(
			JSON.stringify(perpetualLicenseInfo),
			keyPair
		)
		const result = (await licenseManager.getLicenseFromKey(
			almostExpiredLicenseKey
		)) as ValidLicenseKeyResult
		expect(result.isPerpetualLicense).toBe(true)
		expect(result.isPerpetualLicenseExpired).toBe(true)
	})

	it('Fails with invalid host', async () => {
		// @ts-ignore
		delete window.location
		// @ts-ignore
		window.location = new URL('https://www.foo.com')

		const expiredLicenseKey = await generateLicenseKey(STANDARD_LICENSE_INFO, keyPair)
		const result = (await licenseManager.getLicenseFromKey(
			expiredLicenseKey
		)) as ValidLicenseKeyResult
		expect(result.isDomainValid).toBe(false)
	})

	it('Succeeds if hosts is equal to only "*"', async () => {
		// @ts-ignore
		delete window.location
		// @ts-ignore
		window.location = new URL('https://www.foo.com')

		const permissiveHostsInfo = JSON.parse(STANDARD_LICENSE_INFO)
		permissiveHostsInfo[PROPERTIES.HOSTS] = ['*']
		const permissiveLicenseKey = await generateLicenseKey(
			JSON.stringify(permissiveHostsInfo),
			keyPair
		)
		const result = (await licenseManager.getLicenseFromKey(
			permissiveLicenseKey
		)) as ValidLicenseKeyResult
		expect(result.isDomainValid).toBe(true)
	})

	it('Succeeds if has an apex domain specified', async () => {
		// @ts-ignore
		delete window.location
		// @ts-ignore
		window.location = new URL('https://www.example.com')

		const permissiveHostsInfo = JSON.parse(STANDARD_LICENSE_INFO)
		permissiveHostsInfo[PROPERTIES.HOSTS] = ['example.com']
		const permissiveLicenseKey = await generateLicenseKey(
			JSON.stringify(permissiveHostsInfo),
			keyPair
		)
		const result = (await licenseManager.getLicenseFromKey(
			permissiveLicenseKey
		)) as ValidLicenseKeyResult
		expect(result.isDomainValid).toBe(true)
	})

	it('Succeeds if has an www domain specified, but at the apex domain', async () => {
		// @ts-ignore
		delete window.location
		// @ts-ignore
		window.location = new URL('https://example.com')

		const permissiveHostsInfo = JSON.parse(STANDARD_LICENSE_INFO)
		permissiveHostsInfo[PROPERTIES.HOSTS] = ['www.example.com']
		const permissiveLicenseKey = await generateLicenseKey(
			JSON.stringify(permissiveHostsInfo),
			keyPair
		)
		const result = (await licenseManager.getLicenseFromKey(
			permissiveLicenseKey
		)) as ValidLicenseKeyResult
		expect(result.isDomainValid).toBe(true)
	})

	it('Succeeds if has a subdomain wildcard', async () => {
		// @ts-ignore
		delete window.location
		// @ts-ignore
		window.location = new URL('https://sub.example.com')

		const permissiveHostsInfo = JSON.parse(STANDARD_LICENSE_INFO)
		permissiveHostsInfo[PROPERTIES.HOSTS] = ['*.example.com']
		const permissiveLicenseKey = await generateLicenseKey(
			JSON.stringify(permissiveHostsInfo),
			keyPair
		)
		const result = (await licenseManager.getLicenseFromKey(
			permissiveLicenseKey
		)) as ValidLicenseKeyResult
		expect(result.isDomainValid).toBe(true)
	})

	it('Succeeds if has a sub-subdomain wildcard', async () => {
		// @ts-ignore
		delete window.location
		// @ts-ignore
		window.location = new URL('https://pr-2408.sub.example.com')

		const permissiveHostsInfo = JSON.parse(STANDARD_LICENSE_INFO)
		permissiveHostsInfo[PROPERTIES.HOSTS] = ['*.example.com']
		const permissiveLicenseKey = await generateLicenseKey(
			JSON.stringify(permissiveHostsInfo),
			keyPair
		)
		const result = (await licenseManager.getLicenseFromKey(
			permissiveLicenseKey
		)) as ValidLicenseKeyResult
		expect(result.isDomainValid).toBe(true)
	})

	it('Succeeds if has a subdomain wildcard but on an apex domain', async () => {
		// @ts-ignore
		delete window.location
		// @ts-ignore
		window.location = new URL('https://example.com')

		const permissiveHostsInfo = JSON.parse(STANDARD_LICENSE_INFO)
		permissiveHostsInfo[PROPERTIES.HOSTS] = ['*.example.com']
		const permissiveLicenseKey = await generateLicenseKey(
			JSON.stringify(permissiveHostsInfo),
			keyPair
		)
		const result = (await licenseManager.getLicenseFromKey(
			permissiveLicenseKey
		)) as ValidLicenseKeyResult
		expect(result.isDomainValid).toBe(true)
	})

	it('Fails if has a subdomain wildcard isnt for the same base domain', async () => {
		// @ts-ignore
		delete window.location
		// @ts-ignore
		window.location = new URL('https://sub.example.com')

		const permissiveHostsInfo = JSON.parse(STANDARD_LICENSE_INFO)
		permissiveHostsInfo[PROPERTIES.HOSTS] = ['*.foo.com']
		const permissiveLicenseKey = await generateLicenseKey(
			JSON.stringify(permissiveHostsInfo),
			keyPair
		)
		const result = (await licenseManager.getLicenseFromKey(
			permissiveLicenseKey
		)) as ValidLicenseKeyResult
		expect(result.isDomainValid).toBe(false)
	})

	it('Checks for internal license', async () => {
		const internalLicenseInfo = JSON.parse(STANDARD_LICENSE_INFO)
		internalLicenseInfo[PROPERTIES.FLAGS] = FLAGS.INTERNAL_LICENSE
		const internalLicenseKey = await generateLicenseKey(
			JSON.stringify(internalLicenseInfo),
			keyPair
		)
		const result = (await licenseManager.getLicenseFromKey(
			internalLicenseKey
		)) as ValidLicenseKeyResult
		expect(result.isInternalLicense).toBe(true)
	})

	it('Checks for license with watermark', async () => {
		const withWatermarkLicenseInfo = JSON.parse(STANDARD_LICENSE_INFO)
		withWatermarkLicenseInfo[PROPERTIES.FLAGS] |= FLAGS.WITH_WATERMARK
		const withWatermarkLicenseKey = await generateLicenseKey(
			JSON.stringify(withWatermarkLicenseInfo),
			keyPair
		)
		const result = (await licenseManager.getLicenseFromKey(
			withWatermarkLicenseKey
		)) as ValidLicenseKeyResult
		expect(result.isLicensedWithWatermark).toBe(true)
	})
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

function getDefaultLicenseResult(overrides: Partial<ValidLicenseKeyResult>): ValidLicenseKeyResult {
	return {
		isAnnualLicense: true,
		isAnnualLicenseExpired: false,
		isInternalLicense: false,
		isDevelopment: false,
		isDomainValid: true,
		isPerpetualLicense: false,
		isPerpetualLicenseExpired: false,
		isLicenseParseable: true as const,
		isLicensedWithWatermark: false,
		// WatermarkManager does not check these fields, it relies on the calculated values like isAnnualLicenseExpired
		license: {
			id: 'id',
			hosts: ['localhost'],
			flags: FLAGS.PERPETUAL_LICENSE,
			expiryDate: new Date().toISOString(),
		},
		expiryDate: new Date(),
		...overrides,
	}
}

describe(isEditorUnlicensed, () => {
	it('shows watermark when license is not parseable', () => {
		const licenseResult = getDefaultLicenseResult({
			// @ts-ignore
			isLicenseParseable: false,
		})
		expect(isEditorUnlicensed(licenseResult)).toBe(true)
	})

	it('shows watermark when domain is not valid', () => {
		const licenseResult = getDefaultLicenseResult({
			isDomainValid: false,
		})
		expect(isEditorUnlicensed(licenseResult)).toBe(true)
	})

	it('shows watermark when annual license has expired', () => {
		const licenseResult = getDefaultLicenseResult({
			isAnnualLicense: true,
			isAnnualLicenseExpired: true,
		})
		expect(isEditorUnlicensed(licenseResult)).toBe(true)
	})

	it('shows watermark when annual license has expired, even if dev mode', () => {
		const licenseResult = getDefaultLicenseResult({
			isAnnualLicense: true,
			isAnnualLicenseExpired: true,
			isDevelopment: true,
		})
		expect(isEditorUnlicensed(licenseResult)).toBe(true)
	})

	it('shows watermark when perpetual license has expired', () => {
		const licenseResult = getDefaultLicenseResult({
			isPerpetualLicense: true,
			isPerpetualLicenseExpired: true,
		})
		expect(isEditorUnlicensed(licenseResult)).toBe(true)
	})

	it('does not show watermark when license is valid and not expired', () => {
		const licenseResult = getDefaultLicenseResult({
			isAnnualLicense: true,
			isAnnualLicenseExpired: false,
			isInternalLicense: false,
		})
		expect(isEditorUnlicensed(licenseResult)).toBe(false)
	})

	it('does not show watermark when perpetual license is valid and not expired', () => {
		const licenseResult = getDefaultLicenseResult({
			isPerpetualLicense: true,
			isPerpetualLicenseExpired: false,
			isInternalLicense: false,
		})
		expect(isEditorUnlicensed(licenseResult)).toBe(false)
	})

	it('does not show watermark when in development mode', () => {
		const licenseResult = getDefaultLicenseResult({
			isDevelopment: true,
		})
		expect(isEditorUnlicensed(licenseResult)).toBe(false)
	})

	it('does not show watermark when license is parseable and domain is valid', () => {
		const licenseResult = getDefaultLicenseResult({
			isLicenseParseable: true,
			isDomainValid: true,
		})
		expect(isEditorUnlicensed(licenseResult)).toBe(false)
	})

	it('does not show watermark when license is parseable and domain is not valid and dev mode', () => {
		const licenseResult = getDefaultLicenseResult({
			isLicenseParseable: true,
			isDomainValid: false,
			isDevelopment: true,
		})
		expect(isEditorUnlicensed(licenseResult)).toBe(false)
	})

	it('throws when an internal annual license has expired', () => {
		const expiryDate = new Date(2023, 1, 1)
		const licenseResult = getDefaultLicenseResult({
			isAnnualLicense: true,
			isAnnualLicenseExpired: true,
			isInternalLicense: true,
			expiryDate,
		})
		expect(() => isEditorUnlicensed(licenseResult)).toThrow(/License: Internal license expired/)
	})

	it('throws when an internal perpetual license has expired', () => {
		const expiryDate = new Date(2023, 1, 1)
		const licenseResult = getDefaultLicenseResult({
			isPerpetualLicense: true,
			isPerpetualLicenseExpired: true,
			isInternalLicense: true,
			expiryDate,
		})
		expect(() => isEditorUnlicensed(licenseResult)).toThrow(/License: Internal license expired/)
	})

	it('shows watermark when license has that flag specified', () => {
		const licenseResult = getDefaultLicenseResult({
			isLicensedWithWatermark: true,
		})
		expect(isEditorUnlicensed(licenseResult)).toBe(false)
	})
})
