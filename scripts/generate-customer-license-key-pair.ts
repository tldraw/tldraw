/*
  Convert an ArrayBuffer into a string
  from https://developer.chrome.com/blog/how-to-convert-arraybuffer-to-and-from-string/
*/
function ab2str(buf: ArrayBuffer) {
	return String.fromCharCode.apply(null, new Uint8Array(buf) as unknown as number[])
}

async function exportCryptoKey(key: CryptoKey, isPublic = false) {
	const keyType = isPublic ? 'PUBLIC' : 'PRIVATE'
	const exported = await crypto.subtle.exportKey(isPublic ? 'spki' : 'pkcs8', key)
	const exportedAsBase64 = btoa(ab2str(exported))
	return `-----BEGIN ${keyType} KEY-----\n${exportedAsBase64}\n-----END ${keyType} KEY-----`
}

/*
  Generate a sign/verify key pair.
*/
async function generateKeyPair() {
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

	console.log(
		JSON.stringify(
			{
				publicKey,
				privateKey,
			},
			undefined,
			2
		)
	)
}

generateKeyPair()
