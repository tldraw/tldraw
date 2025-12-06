import crypto from 'crypto'
import { vi } from 'vitest'
import { publishDates } from '../../version'
import { str2ab } from '../utils/licensing'
import {
	FLAGS,
	getLicenseState,
	LicenseManager,
	PROPERTIES,
	ValidLicenseKeyResult,
} from './LicenseManager'

vi.mock('../../version', () => {
	return {
		version: '3.15.1',
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
		process.env.NODE_ENV = 'production'
		return new Promise((resolve) => {
			generateKeyPair().then((kp) => {
				keyPair = kp
				licenseManager = new LicenseManager('', keyPair.publicKey)
				resolve(void 0)
			})
		})
		process.env.NODE_ENV = 'test'
	})

	beforeEach(() => {
		// @ts-ignore
		delete window.location
		// @ts-ignore
		window.location = new URL('https://www.example.com')
	})

	describe('Basic license validation', () => {
		it('Fails if no key provided', async () => {
			const result = await licenseManager.getLicenseFromKey('')
			expect(result).toMatchObject({ isLicenseParseable: false, reason: 'no-key-provided' })
		})

		it('Signals that it is development mode when localhost', async () => {
			const schemes = ['http', 'https']
			for (const scheme of schemes) {
				// @ts-ignore
				delete window.location
				// @ts-ignore
				window.location = new URL(`${scheme}://localhost:3000`)

				const testEnvLicenseManager = new LicenseManager('', keyPair.publicKey)
				const licenseKey = await generateLicenseKey(STANDARD_LICENSE_INFO, keyPair)
				const result = await testEnvLicenseManager.getLicenseFromKey(licenseKey)
				expect(result).toMatchObject({
					isLicenseParseable: true,
					isDomainValid: false,
					isDevelopment: true,
				})
			}
		})

		it('Signals that it is development mode when NODE_ENV is not production', async () => {
			process.env.NODE_ENV = 'development'
			// @ts-ignore
			delete window.location
			// @ts-ignore
			window.location = new URL(`https://www.example.com`)

			const testEnvLicenseManager = new LicenseManager('', keyPair.publicKey)
			const licenseKey = await generateLicenseKey(STANDARD_LICENSE_INFO, keyPair)
			const result = await testEnvLicenseManager.getLicenseFromKey(licenseKey)
			expect(result).toMatchObject({
				isLicenseParseable: true,
				isDomainValid: true,
				isDevelopment: true,
			})
			const licenseState = testEnvLicenseManager.state.get()
			expect(licenseState).toBe('unlicensed')
			process.env.NODE_ENV = 'test'
		})

		it('Signals that it is development mode when NODE_ENV is "test"', async () => {
			process.env.NODE_ENV = 'test'
			// @ts-ignore
			delete window.location
			// @ts-ignore
			window.location = new URL(`https://www.example.com`)

			const testEnvLicenseManager = new LicenseManager('', keyPair.publicKey)
			const licenseKey = await generateLicenseKey(STANDARD_LICENSE_INFO, keyPair)
			const result = await testEnvLicenseManager.getLicenseFromKey(licenseKey)
			expect(result).toMatchObject({
				isLicenseParseable: true,
				isDomainValid: true,
				isDevelopment: true,
			})
			const licenseState = testEnvLicenseManager.state.get()
			expect(licenseState).toBe('unlicensed')
			process.env.NODE_ENV = 'test'
		})

		it('Signals that it is not development mode when NODE_ENV is production', async () => {
			process.env.NODE_ENV = 'production'
			// @ts-ignore
			delete window.location
			// @ts-ignore
			window.location = new URL(`https://www.example.com`)

			const testEnvLicenseManager = new LicenseManager('', keyPair.publicKey)
			const licenseKey = await generateLicenseKey(STANDARD_LICENSE_INFO, keyPair)
			const result = await testEnvLicenseManager.getLicenseFromKey(licenseKey)
			expect(result).toMatchObject({
				isLicenseParseable: true,
				isDomainValid: true,
				isDevelopment: false,
			})
			const licenseState = testEnvLicenseManager.state.get()
			expect(licenseState).toBe('unlicensed-production')
			process.env.NODE_ENV = 'test'
		})

		it('Cleanses out valid keys that accidentally have zero-width characters or newlines', async () => {
			const cleanLicenseKey = await generateLicenseKey(STANDARD_LICENSE_INFO, keyPair)
			const dirtyLicenseKey = cleanLicenseKey + '\u200B\u200D\uFEFF\n\r'
			const result = await licenseManager.getLicenseFromKey(dirtyLicenseKey)
			expect(result.isLicenseParseable).toBe(true)
		})

		it('Fails if garbage key provided', async () => {
			process.env.NODE_ENV = 'production'
			const badPublicKeyLicenseManager = new LicenseManager('', 'badpublickey')
			const invalidLicenseKey = await generateLicenseKey(STANDARD_LICENSE_INFO, keyPair)
			const result = await badPublicKeyLicenseManager.getLicenseFromKey(invalidLicenseKey)
			expect(result).toMatchObject({ isLicenseParseable: false, reason: 'invalid-license-key' })
			process.env.NODE_ENV = 'test'
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
				isEvaluationLicense: false,
				isEvaluationLicenseExpired: false,
				daysSinceExpiry: 0,
			} as ValidLicenseKeyResult)
		})
	})

	describe('Domain validation', () => {
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

		it('Succeeds if it is a vscode extension', async () => {
			// @ts-ignore
			delete window.location
			// @ts-ignore
			window.location = new URL(
				'vscode-webview://1ipd8pun8ud7nd7hv9d112g7evi7m10vak9vviuvia66ou6aibp3/index.html?id=6ec2dc7a-afe9-45d9-bd71-1749f9568d28&origin=955b256f-37e1-4a72-a2f4-ad633e88239c&swVersion=4&extensionId=tldraw-org.tldraw-vscode&platform=electron&vscode-resource-base-authority=vscode-resource.vscode-cdn.net&parentOrigin=vscode-file%3A%2F%2Fvscode-app'
			)

			const permissiveHostsInfo = JSON.parse(STANDARD_LICENSE_INFO)
			permissiveHostsInfo[PROPERTIES.HOSTS] = ['tldraw-org.tldraw-vscode']
			const permissiveLicenseKey = await generateLicenseKey(
				JSON.stringify(permissiveHostsInfo),
				keyPair
			)
			const result = (await licenseManager.getLicenseFromKey(
				permissiveLicenseKey
			)) as ValidLicenseKeyResult
			expect(result.isDomainValid).toBe(true)
		})

		it('Fails if it is a vscode extension with the wrong id', async () => {
			// @ts-ignore
			delete window.location
			// @ts-ignore
			window.location = new URL(
				'vscode-webview://1ipd8pun8ud7nd7hv9d112g7evi7m10vak9vviuvia66ou6aibp3/index.html?id=6ec2dc7a-afe9-45d9-bd71-1749f9568d28&origin=955b256f-37e1-4a72-a2f4-ad633e88239c&swVersion=4&extensionId=tldraw-org.tldraw-vscode&platform=electron&vscode-resource-base-authority=vscode-resource.vscode-cdn.net&parentOrigin=vscode-file%3A%2F%2Fvscode-app'
			)

			const permissiveHostsInfo = JSON.parse(STANDARD_LICENSE_INFO)
			permissiveHostsInfo[PROPERTIES.HOSTS] = ['blah-org.blah-vscode']
			const permissiveLicenseKey = await generateLicenseKey(
				JSON.stringify(permissiveHostsInfo),
				keyPair
			)
			const result = (await licenseManager.getLicenseFromKey(
				permissiveLicenseKey
			)) as ValidLicenseKeyResult
			expect(result.isDomainValid).toBe(false)
		})

		it('Succeeds if it is a native app', async () => {
			// @ts-ignore
			delete window.location
			// @ts-ignore
			window.location = new URL('app-bundle://app/index.html')

			const nativeLicenseInfo = JSON.parse(STANDARD_LICENSE_INFO)
			nativeLicenseInfo[PROPERTIES.FLAGS] = FLAGS.NATIVE_LICENSE
			nativeLicenseInfo[PROPERTIES.HOSTS] = ['app-bundle:']
			const nativeLicenseKey = await generateLicenseKey(JSON.stringify(nativeLicenseInfo), keyPair)
			const result = (await licenseManager.getLicenseFromKey(
				nativeLicenseKey
			)) as ValidLicenseKeyResult
			expect(result.isDomainValid).toBe(true)
		})

		it('Succeeds if it is a native app with a wildcard', async () => {
			// @ts-ignore
			delete window.location
			// @ts-ignore
			window.location = new URL('app-bundle://unique-id-123/index.html')

			const nativeLicenseInfo = JSON.parse(STANDARD_LICENSE_INFO)
			nativeLicenseInfo[PROPERTIES.FLAGS] = FLAGS.NATIVE_LICENSE
			nativeLicenseInfo[PROPERTIES.HOSTS] = ['^app-bundle://unique-id-123.*']
			const nativeLicenseKey = await generateLicenseKey(JSON.stringify(nativeLicenseInfo), keyPair)
			const result = (await licenseManager.getLicenseFromKey(
				nativeLicenseKey
			)) as ValidLicenseKeyResult
			expect(result.isDomainValid).toBe(true)
		})

		it('Succeeds if it is a native app with a wildcard and search param', async () => {
			// @ts-ignore
			delete window.location
			// @ts-ignore
			window.location = new URL('app-bundle://app/index.html?unique-id-123')

			const nativeLicenseInfo = JSON.parse(STANDARD_LICENSE_INFO)
			nativeLicenseInfo[PROPERTIES.FLAGS] = FLAGS.NATIVE_LICENSE
			nativeLicenseInfo[PROPERTIES.HOSTS] = ['^app-bundle://app.*unique-id-123.*']
			const nativeLicenseKey = await generateLicenseKey(JSON.stringify(nativeLicenseInfo), keyPair)
			const result = (await licenseManager.getLicenseFromKey(
				nativeLicenseKey
			)) as ValidLicenseKeyResult
			expect(result.isDomainValid).toBe(true)
		})

		it('Fails if it is a native app with the wrong protocol', async () => {
			// @ts-ignore
			delete window.location
			// @ts-ignore
			window.location = new URL('blah-blundle://app/index.html')

			const nativeLicenseInfo = JSON.parse(STANDARD_LICENSE_INFO)
			nativeLicenseInfo[PROPERTIES.FLAGS] = FLAGS.NATIVE_LICENSE
			nativeLicenseInfo[PROPERTIES.HOSTS] = ['app-bundle:']
			const nativeLicenseKey = await generateLicenseKey(JSON.stringify(nativeLicenseInfo), keyPair)
			const result = (await licenseManager.getLicenseFromKey(
				nativeLicenseKey
			)) as ValidLicenseKeyResult
			expect(result.isDomainValid).toBe(false)
		})
	})

	describe('License types and flags', () => {
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

		it('Checks for native license', async () => {
			const nativeLicenseInfo = JSON.parse(STANDARD_LICENSE_INFO)
			nativeLicenseInfo[PROPERTIES.FLAGS] = FLAGS.NATIVE_LICENSE
			const nativeLicenseKey = await generateLicenseKey(JSON.stringify(nativeLicenseInfo), keyPair)

			const result = (await licenseManager.getLicenseFromKey(
				nativeLicenseKey
			)) as ValidLicenseKeyResult
			expect(result.isNativeLicense).toBe(true)
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

		it('Checks for evaluation license', async () => {
			const evaluationLicenseInfo = JSON.parse(STANDARD_LICENSE_INFO)
			evaluationLicenseInfo[PROPERTIES.FLAGS] = FLAGS.EVALUATION_LICENSE
			const evaluationLicenseKey = await generateLicenseKey(
				JSON.stringify(evaluationLicenseInfo),
				keyPair
			)
			const result = (await licenseManager.getLicenseFromKey(
				evaluationLicenseKey
			)) as ValidLicenseKeyResult
			expect(result.isEvaluationLicense).toBe(true)
			expect(result.isEvaluationLicenseExpired).toBe(false)
		})

		it('Detects when evaluation license has expired', async () => {
			const expiredEvaluationLicenseInfo = JSON.parse(STANDARD_LICENSE_INFO)
			expiredEvaluationLicenseInfo[PROPERTIES.FLAGS] = FLAGS.EVALUATION_LICENSE
			const expiredDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1) // 1 day ago
			expiredEvaluationLicenseInfo[PROPERTIES.EXPIRY_DATE] = expiredDate.toISOString()

			const expiredEvaluationLicenseKey = await generateLicenseKey(
				JSON.stringify(expiredEvaluationLicenseInfo),
				keyPair
			)

			// The getLicenseFromKey should return the expired state
			const result = (await licenseManager.getLicenseFromKey(
				expiredEvaluationLicenseKey
			)) as ValidLicenseKeyResult
			expect(result.isEvaluationLicense).toBe(true)
			expect(result.isEvaluationLicenseExpired).toBe(true)
		})
	})

	describe('License expiry and grace period', () => {
		it('Fails if the license key has expired beyond grace period', async () => {
			const expiredLicenseInfo = JSON.parse(STANDARD_LICENSE_INFO)
			const expiryDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 40) // 40 days ago (beyond 30-day grace period)
			expiredLicenseInfo[PROPERTIES.EXPIRY_DATE] = expiryDate
			const expiredLicenseKey = await generateLicenseKey(
				JSON.stringify(expiredLicenseInfo),
				keyPair
			)
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

		it('Handles grace period correctly - 20 days expired should still be within grace period', async () => {
			const expiredLicenseInfo = JSON.parse(STANDARD_LICENSE_INFO)
			const expiredDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 20) // 20 days ago
			expiredLicenseInfo[PROPERTIES.EXPIRY_DATE] = expiredDate.toISOString()

			const expiredLicenseKey = await generateLicenseKey(
				JSON.stringify(expiredLicenseInfo),
				keyPair
			)

			// Test the getLicenseFromKey method to verify grace period calculation
			const result = (await licenseManager.getLicenseFromKey(
				expiredLicenseKey
			)) as ValidLicenseKeyResult
			expect(result.isAnnualLicense).toBe(true)
			expect(result.isAnnualLicenseExpired).toBe(false) // Within 30-day grace period
			expect(result.daysSinceExpiry).toBe(20)
		})

		it('Calculates days since expiry correctly', async () => {
			const expiredLicenseInfo = JSON.parse(STANDARD_LICENSE_INFO)
			const expiredDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 15) // 15 days ago
			expiredLicenseInfo[PROPERTIES.EXPIRY_DATE] = expiredDate.toISOString()

			const expiredLicenseKey = await generateLicenseKey(
				JSON.stringify(expiredLicenseInfo),
				keyPair
			)

			const result = (await licenseManager.getLicenseFromKey(
				expiredLicenseKey
			)) as ValidLicenseKeyResult
			expect(result.daysSinceExpiry).toBe(15)
		})
	})

	describe('Perpetual licenses', () => {
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
	const binaryDer = str2ab(binaryDerString)

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
		isNativeLicense: false,
		isDevelopment: false,
		isDomainValid: true,
		isPerpetualLicense: false,
		isPerpetualLicenseExpired: false,
		isLicenseParseable: true as const,
		isLicensedWithWatermark: false,
		isEvaluationLicense: false,
		isEvaluationLicenseExpired: false,
		daysSinceExpiry: 0,
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

describe('getLicenseState', () => {
	describe('Development mode', () => {
		it('returns "unlicensed" for unparseable license in development', () => {
			const licenseResult = getDefaultLicenseResult({
				// @ts-ignore
				isLicenseParseable: false,
			})
			expect(getLicenseState(licenseResult, () => {}, true)).toBe('unlicensed')
		})

		it('returns "licensed" for invalid domain in development mode', () => {
			const licenseResult = getDefaultLicenseResult({
				isDomainValid: false,
				isDevelopment: true,
			})
			expect(getLicenseState(licenseResult, () => {}, true)).toBe('licensed')
		})

		it('returns "licensed" for valid license in development mode', () => {
			const licenseResult = getDefaultLicenseResult({
				isDevelopment: true,
			})
			expect(getLicenseState(licenseResult, () => {}, true)).toBe('licensed')
		})

		it('returns "unlicensed" for no license key in development (localhost)', () => {
			const licenseResult = getDefaultLicenseResult({
				// @ts-ignore
				isLicenseParseable: false,
				reason: 'no-key-provided',
			})
			expect(getLicenseState(licenseResult, () => {}, true)).toBe('unlicensed')
		})
	})

	describe('Production mode - unlicensed states', () => {
		it('returns "unlicensed-production" for unparseable license in production (invalid-license-key)', () => {
			const messages: string[][] = []
			const licenseResult = getDefaultLicenseResult({
				// @ts-ignore
				isLicenseParseable: false,
				reason: 'invalid-license-key',
			})
			const result = getLicenseState(licenseResult, (msgs) => messages.push(msgs), false)
			expect(result).toBe('unlicensed-production')

			expect(messages).toHaveLength(1)
			expect(messages[0]).toEqual([
				'Invalid license key. tldraw requires a valid license for production use.',
				'Please reach out to sales@tldraw.com to purchase a license.',
			])
		})

		it('returns "unlicensed-production" for no license key in production', () => {
			const messages: string[][] = []
			const licenseResult = getDefaultLicenseResult({
				// @ts-ignore
				isLicenseParseable: false,
				reason: 'no-key-provided',
			})
			const result = getLicenseState(licenseResult, (msgs) => messages.push(msgs), false)
			expect(result).toBe('unlicensed-production')

			expect(messages).toHaveLength(1)
			expect(messages[0]).toEqual([
				'No tldraw license key provided!',
				'A license is required for production deployments.',
				'Please reach out to sales@tldraw.com to purchase a license.',
			])
		})

		it('returns "unlicensed-production" for invalid license key in production', () => {
			const messages: string[][] = []
			const licenseResult = getDefaultLicenseResult({
				// @ts-ignore
				isLicenseParseable: false,
				reason: 'invalid-license-key',
			})
			const result = getLicenseState(licenseResult, (msgs) => messages.push(msgs), false)
			expect(result).toBe('unlicensed-production')

			expect(messages).toHaveLength(1)
			expect(messages[0]).toEqual([
				'Invalid license key. tldraw requires a valid license for production use.',
				'Please reach out to sales@tldraw.com to purchase a license.',
			])
		})

		it('returns "unlicensed-production" for invalid domain in production', () => {
			const messages: string[][] = []
			const licenseResult = getDefaultLicenseResult({
				isDomainValid: false,
				isDevelopment: false,
			})
			const result = getLicenseState(licenseResult, (msgs) => messages.push(msgs), false)
			expect(result).toBe('unlicensed-production')

			expect(messages).toHaveLength(1)
			expect(messages[0]).toEqual([
				'License key is not valid for this domain.',
				'A license is required for production deployments.',
				'Please reach out to sales@tldraw.com to purchase a license.',
			])
		})

		it('returns "unlicensed-production" for expired internal license with invalid domain', () => {
			const messages: string[][] = []
			const expiryDate = new Date(2023, 1, 1)
			const licenseResult = getDefaultLicenseResult({
				isAnnualLicense: true,
				isAnnualLicenseExpired: true,
				isInternalLicense: true,
				isDomainValid: false,
				expiryDate,
			})
			const result = getLicenseState(licenseResult, (msgs) => messages.push(msgs), false)
			expect(result).toBe('unlicensed-production')

			expect(messages).toHaveLength(1)
			expect(messages[0]).toEqual([
				'License key is not valid for this domain.',
				'A license is required for production deployments.',
				'Please reach out to sales@tldraw.com to purchase a license.',
			])
		})
	})

	describe('Valid licenses', () => {
		it('returns "licensed" for valid annual license', () => {
			const licenseResult = getDefaultLicenseResult({
				isAnnualLicense: true,
				isAnnualLicenseExpired: false,
			})
			expect(getLicenseState(licenseResult, () => {}, false)).toBe('licensed')
		})

		it('returns "licensed" for valid perpetual license', () => {
			const licenseResult = getDefaultLicenseResult({
				isPerpetualLicense: true,
				isPerpetualLicenseExpired: false,
			})
			expect(getLicenseState(licenseResult, () => {}, false)).toBe('licensed')
		})

		it('returns "licensed-with-watermark" for watermarked license', () => {
			const licenseResult = getDefaultLicenseResult({
				isLicensedWithWatermark: true,
			})
			expect(getLicenseState(licenseResult, () => {}, false)).toBe('licensed-with-watermark')
		})

		it('returns "licensed" for valid evaluation license', () => {
			const licenseResult = getDefaultLicenseResult({
				isEvaluationLicense: true,
				isLicensedWithWatermark: false, // Evaluation license doesn't need WITH_WATERMARK flag
				isAnnualLicense: false,
				isPerpetualLicense: false,
			})

			// Evaluation license should be licensed but tracked (no watermark shown)
			expect(getLicenseState(licenseResult, () => {}, false)).toBe('licensed')

			// Verify evaluation license properties
			expect(licenseResult.isEvaluationLicense).toBe(true)
			expect(licenseResult.isLicensedWithWatermark).toBe(false) // No explicit watermark flag needed
			expect(licenseResult.isAnnualLicense).toBe(false)
			expect(licenseResult.isPerpetualLicense).toBe(false)
		})
	})

	describe('Grace period handling', () => {
		it('returns "licensed" for license 0-30 days past expiry', () => {
			const messages: string[][] = []
			const licenseResult = getDefaultLicenseResult({
				isAnnualLicense: true,
				isAnnualLicenseExpired: false, // Still within 30-day grace period
				daysSinceExpiry: 20, // 20 days past expiry
				isInternalLicense: false,
			})

			expect(getLicenseState(licenseResult, (msgs) => messages.push(msgs), false)).toBe('licensed')

			expect(messages).toHaveLength(1)
			expect(messages[0]).toEqual([
				'Your tldraw license has expired.',
				'License expired 20 days ago.',
				'Please reach out to sales@tldraw.com to renew your license.',
			])
		})
	})

	describe('Expired licenses', () => {
		it('returns "expired" for license 30+ days past expiry', () => {
			const messages: string[][] = []
			const licenseResult = getDefaultLicenseResult({
				isAnnualLicense: true,
				isAnnualLicenseExpired: true, // Beyond 30-day grace period
				daysSinceExpiry: 35, // 35 days past expiry
				isInternalLicense: false,
			})

			expect(getLicenseState(licenseResult, (msgs) => messages.push(msgs), false)).toBe('expired')

			expect(messages).toHaveLength(1)
			expect(messages[0]).toEqual([
				'Your tldraw license has been expired for more than 30 days!',
				'Please reach out to sales@tldraw.com to renew your license.',
			])
		})

		it('returns "expired" for expired annual license even in dev mode', () => {
			const licenseResult = getDefaultLicenseResult({
				isAnnualLicense: true,
				isAnnualLicenseExpired: true,
				isDevelopment: true,
				isInternalLicense: false,
			})
			expect(getLicenseState(licenseResult, () => {}, true)).toBe('expired')
		})

		it('returns "expired" for expired perpetual license', () => {
			const licenseResult = getDefaultLicenseResult({
				isPerpetualLicense: true,
				isPerpetualLicenseExpired: true,
				isInternalLicense: false,
			})
			expect(getLicenseState(licenseResult, () => {}, false)).toBe('expired')
		})

		it('returns "expired" for expired evaluation license', () => {
			const messages: string[][] = []
			const licenseResult = getDefaultLicenseResult({
				isEvaluationLicense: true,
				isEvaluationLicenseExpired: true,
				isAnnualLicense: false,
				isPerpetualLicense: false,
			})

			expect(getLicenseState(licenseResult, (msgs) => messages.push(msgs), false)).toBe('expired')

			expect(messages).toHaveLength(1)
			expect(messages[0]).toEqual([
				'Your tldraw evaluation license has expired!',
				'Please reach out to sales@tldraw.com to purchase a full license.',
			])
		})

		it('returns "expired" for expired internal annual license with valid domain', () => {
			const messages: string[][] = []
			const expiryDate = new Date(2023, 1, 1)
			const licenseResult = getDefaultLicenseResult({
				isAnnualLicense: true,
				isAnnualLicenseExpired: true,
				isInternalLicense: true,
				isDomainValid: true,
				expiryDate,
			})

			expect(getLicenseState(licenseResult, (msgs) => messages.push(msgs), false)).toBe('expired')

			expect(messages).toHaveLength(1)
			expect(messages[0]).toEqual([
				'Your tldraw license has been expired for more than 30 days!',
				'Please reach out to sales@tldraw.com to renew your license.',
			])
		})

		it('returns "expired" for expired internal perpetual license with valid domain', () => {
			const messages: string[][] = []
			const expiryDate = new Date(2023, 1, 1)
			const licenseResult = getDefaultLicenseResult({
				isPerpetualLicense: true,
				isPerpetualLicenseExpired: true,
				isInternalLicense: true,
				isDomainValid: true,
				expiryDate,
			})

			expect(getLicenseState(licenseResult, (msgs) => messages.push(msgs), false)).toBe('expired')

			expect(messages).toHaveLength(1)
			expect(messages[0]).toEqual([
				'Your tldraw license has been expired for more than 30 days!',
				'Please reach out to sales@tldraw.com to renew your license.',
			])
		})
	})
})
