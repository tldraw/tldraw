/*
  Convert a string into an ArrayBuffer
  from https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
*/
export function str2ab(str: string) {
	const buf = new ArrayBuffer(str.length) as Uint8Array
	const bufView = new Uint8Array(buf)
	for (let i = 0, strLen = str.length; i < strLen; i++) {
		bufView[i] = str.charCodeAt(i)
	}
	return buf
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
		new Uint8Array(binaryDer),
		{
			name: 'ECDSA',
			namedCurve: 'P-384',
		},
		true,
		['verify']
	)
}
