/**
 * HMAC-SHA256 sign a webhook body. Returns the signature as lowercase hex.
 */
export async function signWebhookBody(body: string, secret: string): Promise<string> {
	const encoder = new TextEncoder()
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	)
	const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
	const bytes = new Uint8Array(signature)
	let hex = ''
	for (let i = 0; i < bytes.length; i++) {
		hex += bytes[i].toString(16).padStart(2, '0')
	}
	return hex
}
