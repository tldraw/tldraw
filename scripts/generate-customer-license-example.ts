import { execSync } from 'child_process'

/*
  Convert a string into an ArrayBuffer
  from https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
*/
function str2ab(str: string) {
	const buf = new ArrayBuffer(str.length)
	const bufView = new Uint8Array(buf)
	for (let i = 0, strLen = str.length; i < strLen; i++) {
		bufView[i] = str.charCodeAt(i)
	}
	return buf
}

/*
  Convert an ArrayBuffer into a string
  from https://developer.chrome.com/blog/how-to-convert-arraybuffer-to-and-from-string/
*/
function ab2str(buf: ArrayBuffer) {
	return String.fromCharCode.apply(null, new Uint8Array(buf) as unknown as number[])
}

/*
  Import a PEM encoded RSA private key, to use for RSA-PSS signing.
  Takes a string containing the PEM encoded key, and returns a Promise
  that will resolve to a CryptoKey representing the private key.
*/
function importPrivateKey(pem: string) {
	// fetch the part of the PEM string between header and footer
	const pemHeader = '-----BEGIN PRIVATE KEY-----'
	const pemFooter = '-----END PRIVATE KEY-----'
	const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length - 1)
	// base64 decode the string to get the binary data
	const binaryDerString = atob(pemContents)
	// convert from a binary string to an ArrayBuffer
	const binaryDer = str2ab(binaryDerString)

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

async function generate() {
	const message = JSON.stringify({ companyName: 'tldraw', expiryDate: '2038-01-19' })
	const enc = new TextEncoder()
	const encodedMsg = enc.encode(message)
	const jsonResult = execSync('yarn generate-customer-license-key-pair').toString().trim()
	const keyPair = JSON.parse(jsonResult)
	const publicKey = keyPair.publicKey
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

	console.log(
		JSON.stringify(
			{
				publicKey,
				privateKey: keyPair.privateKey,
				message,
				signedLicenseKey: signature,
				licenseKey,
			},
			undefined,
			2
		)
	)
}

generate()
