import { Environment } from '../types'
import { base64UrlDecode, base64UrlEncode } from './base64'

// A tab render job id is a random nonce and an HMAC of it with the room's id. The reply route takes
// no sign-in, so without the signature anyone could make up a room id and a UUID and wake that room's
// durable object just to be told the job doesn't exist. With it, a made-up id is refused in the
// worker and never reaches the object.
//
// Keyed off MCP_SCREENSHOT_TOKEN_SECRET, which every deployment already has. The prefix keeps a job
// id from ever passing as a render token signature, or the reverse.
const SIGNED_PREFIX = 'mcp-tab-render-job:'

const NONCE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export async function mintTabRenderJobIds(
	env: Environment,
	roomId: string,
	count: number
): Promise<string[]> {
	const key = await getKey(env)
	if (!key) throw new Error('MCP_SCREENSHOT_TOKEN_SECRET is not configured')
	return Promise.all(
		Array.from({ length: count }, async () => {
			const nonce = crypto.randomUUID()
			const signature = await crypto.subtle.sign('HMAC', key, signedBytes(roomId, nonce))
			return `${nonce}.${base64UrlEncode(new Uint8Array(signature))}`
		})
	)
}

/** Whether this id was minted for this room. Says nothing about whether its job is still live. */
export async function isTabRenderJobIdFor(
	env: Environment,
	roomId: string,
	jobId: string
): Promise<boolean> {
	const [nonce, signature, ...rest] = jobId.split('.')
	if (rest.length > 0 || !nonce || !signature || !NONCE_PATTERN.test(nonce)) return false
	const key = await getKey(env)
	if (!key) return false

	let signatureBytes: Uint8Array<ArrayBuffer>
	try {
		signatureBytes = base64UrlDecode(signature)
	} catch {
		return false
	}
	return crypto.subtle.verify('HMAC', key, signatureBytes, signedBytes(roomId, nonce))
}

function signedBytes(roomId: string, nonce: string) {
	return new TextEncoder().encode(`${SIGNED_PREFIX}${roomId}:${nonce}`)
}

async function getKey(env: Environment) {
	const secret = env.MCP_SCREENSHOT_TOKEN_SECRET
	if (!secret) return null
	return crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign', 'verify']
	)
}
