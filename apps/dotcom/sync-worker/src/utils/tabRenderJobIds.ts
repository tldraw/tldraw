import { Environment } from '../types'
import { base64UrlDecode, base64UrlEncode } from './base64'

// A tab render job id is a random nonce, an expiry, and an HMAC of both with the room's id. The reply
// route takes no sign-in, so without the signature anyone could make up a room id and a UUID and wake
// that room's durable object just to be told the job doesn't exist. With it, a made-up id is refused
// in the worker and never reaches the object, and so is a real one replayed after it expires.
//
// Keyed off MCP_SCREENSHOT_TOKEN_SECRET, which every deployment already has. The prefix keeps a job
// id from ever passing as a render token signature, or the reverse.
const SIGNED_PREFIX = 'mcp-tab-render-job:'

const NONCE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const EXPIRY_PATTERN = /^\d{1,15}$/

// A job is over within TAB_RENDER_ACK_TIMEOUT_MS plus the longest TAB_RENDER_WORK_TIMEOUT_MS, about
// 10s. The rest is slack for clock drift between the isolate that mints an id and the one that checks
// it: too tight and a slow tab's genuine reply is refused as forged.
export const TAB_RENDER_JOB_ID_TTL_MS = 2 * 60_000

export async function mintTabRenderJobIds(
	env: Environment,
	roomId: string,
	count: number
): Promise<string[]> {
	const key = await getKey(env)
	if (!key) throw new Error('MCP_SCREENSHOT_TOKEN_SECRET is not configured')
	const expiresAt = String(Date.now() + TAB_RENDER_JOB_ID_TTL_MS)
	return Promise.all(
		Array.from({ length: count }, async () => {
			const nonce = crypto.randomUUID()
			const signature = await crypto.subtle.sign('HMAC', key, signedBytes(roomId, nonce, expiresAt))
			return `${nonce}.${expiresAt}.${base64UrlEncode(new Uint8Array(signature))}`
		})
	)
}

/**
 * Whether this id was minted for this room and hasn't expired. Says nothing about whether its job is
 * still live: that ends well before the id does.
 */
export async function isTabRenderJobIdFor(
	env: Environment,
	roomId: string,
	jobId: string
): Promise<boolean> {
	const [nonce, expiresAt, signature, ...rest] = jobId.split('.')
	if (rest.length > 0 || !nonce || !expiresAt || !signature) return false
	if (!NONCE_PATTERN.test(nonce) || !EXPIRY_PATTERN.test(expiresAt)) return false
	if (Number(expiresAt) <= Date.now()) return false
	const key = await getKey(env)
	if (!key) return false

	let signatureBytes: Uint8Array<ArrayBuffer>
	try {
		signatureBytes = base64UrlDecode(signature)
	} catch {
		return false
	}
	return crypto.subtle.verify('HMAC', key, signatureBytes, signedBytes(roomId, nonce, expiresAt))
}

function signedBytes(roomId: string, nonce: string, expiresAt: string) {
	return new TextEncoder().encode(`${SIGNED_PREFIX}${roomId}:${nonce}:${expiresAt}`)
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
