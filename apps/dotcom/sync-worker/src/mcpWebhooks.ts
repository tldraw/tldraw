// Webhook delivery for the MCP Events extension (SEP-3415): the Standard Webhooks profile it
// specifies, shared by the MCP route (which verifies a callback before subscribing it) and the file's
// Durable Object (which delivers mentions as they happen).

/** Why a callback failed, as the extension's `lastError` categories. Never a raw response. */
export type WebhookFailure =
	| 'connection_refused'
	| 'timeout'
	| 'tls_error'
	| 'http_4xx'
	| 'http_5xx'
	| 'challenge_failed'

export type WebhookPostResult =
	| { ok: true; body: string }
	// `retry` false for the statuses the extension says not to retry: 410 and 413.
	| { ok: false; failure: WebhookFailure; retry: boolean }

/** How long a callback has to answer before the attempt counts as a timeout. */
export const WEBHOOK_TIMEOUT_MS = 5000

/**
 * A `delivery.secret`'s signing key: the bytes after `whsec_`, which must decode to 24–64 bytes.
 * Null for anything else, which the route refuses with `InvalidParams`.
 */
export function parseWebhookSecret(secret: unknown): Uint8Array<ArrayBuffer> | null {
	if (typeof secret !== 'string' || !secret.startsWith('whsec_')) return null
	let bytes: Uint8Array<ArrayBuffer>
	try {
		bytes = Uint8Array.from(atob(secret.slice('whsec_'.length)), (c) => c.charCodeAt(0))
	} catch {
		return null
	}
	return bytes.length >= 24 && bytes.length <= 64 ? bytes : null
}

/**
 * Why a callback URL can't be subscribed, or null when it can: `https` only, and no host that names a
 * loopback, private or link-local address directly.
 *
 * The rest of the extension's SSRF rule — checking the *resolved* address at delivery time — is the
 * network's: a Worker's `fetch` goes out through Cloudflare's edge, which doesn't route to private
 * ranges, and deliveries never follow redirects (see `postWebhook`).
 */
export function getCallbackUrlProblem(value: unknown): string | null {
	if (typeof value !== 'string') return 'delivery.url must be a string'
	let url: URL
	try {
		url = new URL(value)
	} catch {
		return 'delivery.url must be an absolute URL'
	}
	if (url.protocol !== 'https:') return 'delivery.url must use https'
	if (url.username || url.password) return 'delivery.url must not carry credentials'
	const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
	if (
		host === 'localhost' ||
		host.endsWith('.localhost') ||
		host.endsWith('.internal') ||
		host.endsWith('.local') ||
		isPrivateIpLiteral(host)
	) {
		return 'delivery.url must be a publicly reachable host'
	}
	return null
}

function isPrivateIpLiteral(host: string) {
	const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
	if (v4) {
		const [a, b] = [Number(v4[1]), Number(v4[2])]
		return (
			a === 0 ||
			a === 10 ||
			a === 127 ||
			(a === 100 && b >= 64 && b <= 127) ||
			(a === 169 && b === 254) ||
			(a === 172 && b >= 16 && b <= 31) ||
			(a === 192 && b === 168) ||
			a >= 224
		)
	}
	if (!host.includes(':')) return false
	return (
		host === '::' ||
		host === '::1' ||
		host.startsWith('fc') ||
		host.startsWith('fd') ||
		host.startsWith('fe8') ||
		host.startsWith('fe9') ||
		host.startsWith('fea') ||
		host.startsWith('feb') ||
		host.startsWith('::ffff:')
	)
}

/** A high-entropy `webhook-id`, never derived from the event: `msg_<random>` or `msg_<type>_<random>`. */
export function newWebhookId(type?: string) {
	const random = crypto.randomUUID().replaceAll('-', '')
	return type ? `msg_${type}_${random}` : `msg_${random}`
}

/** `v1,` + base64 HMAC-SHA256 over `id.timestamp.body`, per Standard Webhooks. */
export async function signWebhook(
	key: Uint8Array<ArrayBuffer>,
	webhookId: string,
	timestamp: number,
	body: string
): Promise<string> {
	const cryptoKey = await crypto.subtle.importKey(
		'raw',
		key,
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	)
	const mac = await crypto.subtle.sign(
		'HMAC',
		cryptoKey,
		new TextEncoder().encode(`${webhookId}.${timestamp}.${body}`)
	)
	return `v1,${btoa(String.fromCharCode(...new Uint8Array(mac)))}`
}

/**
 * One signed POST to a callback. The timestamp and signature are fresh on every call, which is what
 * a retry needs; the caller keeps `webhookId` the same across retries of one message.
 */
export async function postWebhook({
	url,
	secret,
	subscriptionId,
	webhookId,
	body,
}: {
	url: string
	secret: Uint8Array<ArrayBuffer>
	subscriptionId: string
	webhookId: string
	body: string
}): Promise<WebhookPostResult> {
	const timestamp = Math.floor(Date.now() / 1000)
	let response: Response
	try {
		response = await fetch(url, {
			method: 'POST',
			// A redirect could point anywhere, including somewhere the URL check above would refuse.
			redirect: 'manual',
			signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
			headers: {
				'content-type': 'application/json',
				'webhook-id': webhookId,
				'webhook-timestamp': String(timestamp),
				'webhook-signature': await signWebhook(secret, webhookId, timestamp, body),
				'x-mcp-subscription-id': subscriptionId,
			},
			body,
		})
	} catch (error) {
		const name = error instanceof Error ? error.name : ''
		if (name === 'TimeoutError' || name === 'AbortError') {
			return { ok: false, failure: 'timeout', retry: true }
		}
		const message = error instanceof Error ? error.message.toLowerCase() : ''
		return {
			ok: false,
			failure:
				message.includes('tls') || message.includes('ssl') ? 'tls_error' : 'connection_refused',
			retry: true,
		}
	}
	if (response.status >= 200 && response.status < 300) {
		return { ok: true, body: await response.text().catch(() => '') }
	}
	// Drained either way, so the connection can be reused.
	await response.body?.cancel().catch(() => {})
	if (response.status === 410 || response.status === 413) {
		return { ok: false, failure: 'http_4xx', retry: false }
	}
	return {
		ok: false,
		failure: response.status >= 500 ? 'http_5xx' : 'http_4xx',
		// 3xx (an unfollowed redirect) and other 4xx are retried like any failure; the bound on
		// attempts is what stops a misconfigured endpoint from being hammered.
		retry: true,
	}
}

/**
 * The verification handshake: POST a signed `verification` envelope carrying a single-use challenge,
 * and accept the endpoint only if it echoes the challenge in a 2xx body. Compared in constant time.
 */
export async function verifyWebhookEndpoint({
	url,
	secret,
	subscriptionId,
}: {
	url: string
	secret: Uint8Array<ArrayBuffer>
	subscriptionId: string
}): Promise<{ ok: true } | { ok: false; failure: WebhookFailure }> {
	const challenge = crypto.randomUUID()
	const posted = await postWebhook({
		url,
		secret,
		subscriptionId,
		webhookId: newWebhookId('verification'),
		body: JSON.stringify({ type: 'verification', challenge }),
	})
	if (!posted.ok) return { ok: false, failure: posted.failure }
	let echoed: unknown
	try {
		echoed = (JSON.parse(posted.body) as { challenge?: unknown }).challenge
	} catch {
		return { ok: false, failure: 'challenge_failed' }
	}
	return typeof echoed === 'string' && constantTimeEqual(echoed, challenge)
		? { ok: true }
		: { ok: false, failure: 'challenge_failed' }
}

function constantTimeEqual(a: string, b: string) {
	const left = new TextEncoder().encode(a)
	const right = new TextEncoder().encode(b)
	let diff = left.length ^ right.length
	for (let i = 0; i < Math.max(left.length, right.length); i++) {
		diff |= (left[i] ?? 0) ^ (right[i] ?? 0)
	}
	return diff === 0
}
