#!/usr/bin/env npx tsx

/**
 * Test License Key Generator
 *
 * This script generates various license keys for manual testing of the LicenseManager.
 * Uses the existing test utilities from LicenseManager.test.ts
 */

import crypto from 'crypto'
import { FLAGS } from '../../packages/editor/src/lib/license/LicenseManager'
import { str2ab } from '../../packages/editor/src/lib/utils/licensing'
// Utility function copied from LicenseManager.test.ts to avoid import issues
function ab2str(buf: ArrayBuffer) {
	return String.fromCharCode.apply(null, Array.from(new Uint8Array(buf)))
}

// Utility functions copied from LicenseManager.test.ts (not exported)
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

function importPrivateKey(pemContents: string) {
	const binaryDerString = atob(pemContents)
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

async function exportCryptoKey(key: CryptoKey, isPublic = false) {
	const exported = await crypto.subtle.exportKey(isPublic ? 'spki' : 'pkcs8', key)
	return btoa(ab2str(exported))
}

// Generate a fresh key pair for each run
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

function createLicenseInfo(id: string, hosts: string[], flags: number, expiryDate: string) {
	return JSON.stringify([id, hosts, flags, expiryDate])
}

function getDateOffset(days: number): string {
	const date = new Date()
	date.setDate(date.getDate() + days)
	return date.toISOString().slice(0, 10)
}

async function main() {
	console.log('🔑 Generating test license keys for LicenseManager testing...\n')

	console.log('Generating fresh key pair for testing...')
	const keyPair = await generateKeyPair()
	console.log('Public Key:', keyPair.publicKey)
	console.log('Private Key:', keyPair.privateKey)
	console.log('')

	const testCases = [
		// === VALID LICENSES ===
		{
			name: 'Valid Annual License',
			info: createLicenseInfo(
				'test-annual-valid',
				['localhost'],
				FLAGS.ANNUAL_LICENSE,
				getDateOffset(60) // 2 months future
			),
		},
		{
			name: 'Valid Perpetual License',
			info: createLicenseInfo(
				'test-perpetual-valid',
				['localhost'],
				FLAGS.PERPETUAL_LICENSE,
				getDateOffset(365) // 1 year future
			),
		},
		{
			name: 'Valid Evaluation License',
			info: createLicenseInfo(
				'test-eval-valid',
				['localhost'],
				FLAGS.EVALUATION_LICENSE,
				getDateOffset(14) // 2 weeks future
			),
		},
		{
			name: 'Valid Internal License',
			info: createLicenseInfo(
				'test-internal-valid',
				['localhost'],
				FLAGS.ANNUAL_LICENSE | FLAGS.INTERNAL_LICENSE,
				getDateOffset(60) // 2 months future
			),
		},
		{
			name: 'License with Watermark Flag',
			info: createLicenseInfo(
				'test-watermark-only',
				['localhost'],
				FLAGS.WITH_WATERMARK,
				getDateOffset(60) // 2 months future
			),
		},

		// === GRACE PERIOD TESTING ===
		{
			name: 'Annual License (expired 15 days - within grace period)',
			info: createLicenseInfo(
				'test-grace-15days',
				['localhost'],
				FLAGS.ANNUAL_LICENSE,
				getDateOffset(-15) // 15 days past
			),
		},
		{
			name: 'Annual License (expired 45 days - beyond grace period)',
			info: createLicenseInfo(
				'test-annual-expired-45days',
				['localhost'],
				FLAGS.ANNUAL_LICENSE,
				getDateOffset(-45) // 45 days past
			),
		},

		// === EXPIRED INTERNAL LICENSES ===
		{
			name: 'Internal License (expired 15 days - within grace period)',
			info: createLicenseInfo(
				'test-internal-expired-15days',
				['localhost'],
				FLAGS.ANNUAL_LICENSE | FLAGS.INTERNAL_LICENSE,
				getDateOffset(-15) // 15 days past
			),
		},
		{
			name: 'Internal License (expired 45 days - beyond grace period)',
			info: createLicenseInfo(
				'test-internal-expired-45days',
				['localhost'],
				FLAGS.ANNUAL_LICENSE | FLAGS.INTERNAL_LICENSE,
				getDateOffset(-45) // 45 days past
			),
		},

		// === EXPIRED EVALUATION LICENSES ===
		{
			name: 'Evaluation License (expired 1 day)',
			info: createLicenseInfo(
				'test-eval-expired-1day',
				['localhost'],
				FLAGS.EVALUATION_LICENSE,
				getDateOffset(-1) // 1 day past
			),
		},
		{
			name: 'Evaluation License (expired 15 days)',
			info: createLicenseInfo(
				'test-eval-expired-15days',
				['localhost'],
				FLAGS.EVALUATION_LICENSE,
				getDateOffset(-15) // 15 days past
			),
		},
	]

	console.log('🎫 Generated Test License Keys:\n')

	for (const testCase of testCases) {
		try {
			const licenseKey = await generateLicenseKey(testCase.info, keyPair)
			console.log(`## ${testCase.name}`)
			console.log(`License Info: ${testCase.info}`)
			console.log(`License Key: ${licenseKey}`)
			console.log('')
		} catch (error) {
			console.error(`❌ Failed to generate license for ${testCase.name}:`, error)
		}
	}

	console.log('📝 Usage Instructions:')
	console.log('')
	console.log('🚨 DO NOT COMMIT THESE KEYS TO THE REPOSITORY! 🚨')
	console.log('These are temporary test keys - generate fresh ones for each session')
	console.log('')
	console.log('Option 1 - Update LicenseManager (development):')
	console.log(`  Replace publicKey in LicenseManager.ts with: "${keyPair.publicKey}"`)
	console.log('  Then use: <Tldraw licenseKey="license-key-from-above" />')
	console.log('')
	console.log('Option 2 - Pass testPublicKey (automated testing):')
	console.log(`  new LicenseManager("license-key", "${keyPair.publicKey}", "production")`)
	console.log('')
	console.log('ℹ️  For production licenses: sales@tldraw.com')
}

main().catch(console.error)
