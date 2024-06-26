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

function importPublicKey(pem: string) {
	const pemHeader = '-----BEGIN PUBLIC KEY-----'
	const pemFooter = '-----END PUBLIC KEY-----'
	const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length - 1)
	// base64 decode the string to get the binary data
	const binaryDerString = atob(pemContents)
	// convert from a binary string to an ArrayBuffer
	const binaryDer = str2ab(binaryDerString)

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

async function extract() {
	const jsonResult = execSync('yarn generate-customer-license-example').toString().trim()
	const info = JSON.parse(jsonResult)
	const key = info.licenseKey
	const publicKey = info.publicKey
	const [data, signature] = key.split('.')
	const [prefix, encodedData] = data.split('/')
	if (prefix !== 'tldraw') {
		throw new Error(`Unsupported prefix '${prefix}'`)
	}

	const publicCryptoKey = await importPublicKey(publicKey)

	const isVerified = await crypto.subtle.verify(
		{
			name: 'ECDSA',
			hash: { name: 'SHA-384' },
		},
		publicCryptoKey,
		str2ab(signature),
		str2ab(encodedData)
	)

	if (isVerified) {
		throw new Error('Invalid license key')
	}

	const decodedData = JSON.parse(atob(encodedData))

	console.log({
		decodedData,
	})
}

extract()
