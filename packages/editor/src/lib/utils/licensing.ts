import crypto from 'crypto'
/*
  Convert an ArrayBuffer into a string
  from https://developer.chrome.com/blog/how-to-convert-arraybuffer-to-and-from-string/
*/
export function ab2str(buf: ArrayBuffer) {
	return String.fromCharCode.apply(null, buf as unknown as number[])
}
/*
  Convert a string into an ArrayBuffer
  from https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
*/
export function str2ab(str: string) {
	const buf = new ArrayBuffer(str.length) as Uint8Array
	const bufView = buf
	for (let i = 0, strLen = str.length; i < strLen; i++) {
		bufView[i] = str.charCodeAt(i)
	}
	return buf
}

export async function exportCryptoKey(key: CryptoKey, isPublic = false) {
	const keyType = isPublic ? 'PUBLIC' : 'PRIVATE'
	const exported = await crypto.subtle.exportKey(isPublic ? 'spki' : 'pkcs8', key)
	const exportedAsBase64 = btoa(ab2str(exported))
	return `-----BEGIN ${keyType} KEY-----\n${exportedAsBase64}\n-----END ${keyType} KEY-----`
}

/*
  Generate a sign/verify key pair.
*/
export async function generateKeyPair() {
	const keyPair = await crypto.subtle.generateKey(
		{
			name: 'ECDSA',
			namedCurve: 'P-384',
		},
		true,
		['sign', 'verify']
	)
	const publicKey = await exportCryptoKey(keyPair.publicKey, true /* isPublic */)
	const privateKey = await exportCryptoKey(keyPair.privateKey)

	return { publicKey, privateKey }
}

/*
  Import a PEM encoded RSA private key, to use for RSA-PSS signing.
  Takes a string containing the PEM encoded key, and returns a Promise
  that will resolve to a CryptoKey representing the private key.
*/
export function importPrivateKey(pem: string) {
	// fetch the part of the PEM string between header and footer
	const pemHeader = '-----BEGIN PRIVATE KEY-----'
	const pemFooter = '-----END PRIVATE KEY-----'
	const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length - 1)
	// base64 decode the string to get the binary data
	const binaryDerString = atob(pemContents)
	// convert from a binary string to an ArrayBuffer
	const binaryDer = str2ab(binaryDerString) as Uint8Array

	return crypto.subtle.importKey(
		'pkcs8',
		binaryDer,
		{
			name: 'ECDSA',
			namedCurve: 'P-384',
		},
		true,
		['sign']
	)
}

export function importPublicKey(pem: string) {
	const pemHeader = '-----BEGIN PUBLIC KEY-----'
	const pemFooter = '-----END PUBLIC KEY-----'
	const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length - 1)
	// base64 decode the string to get the binary data
	const binaryDerString = atob(pemContents)
	// convert from a binary string to an ArrayBuffer
	const binaryDer = str2ab(binaryDerString) as Uint8Array

	return crypto.subtle.importKey(
		'spki',
		binaryDer,
		{
			name: 'ECDSA',
			namedCurve: 'P-384',
		},
		true,
		['verify']
	)
}

export async function generateLicenseKey(
	message: string,
	keyPair: { publicKey: string; privateKey: string }
) {
	const enc = new TextEncoder()
	const encodedMsg = enc.encode(message)
	const privateKey = await importPrivateKey(keyPair.privateKey)

	const signedLicenseKeyBuffer = await crypto.subtle.sign(
		{
			name: 'ECDSA',
			hash: { name: 'SHA-384' },
		},
		privateKey,
		encodedMsg
	)

	const signature = btoa(ab2str(signedLicenseKeyBuffer))
	const prefix = 'tldraw'
	const licenseKey = `${prefix}/${btoa(message)}.${signature}`

	return licenseKey
}
