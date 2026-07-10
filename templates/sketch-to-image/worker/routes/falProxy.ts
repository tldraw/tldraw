import { IRequest } from 'itty-router'

/**
 * The header the fal client uses to tell the proxy which fal endpoint to call.
 * See https://fal.ai/docs/model-endpoints/server-side
 */
const TARGET_URL_HEADER = 'x-fal-target-url'

/** Only these hosts are valid fal targets. */
const ALLOWED_HOST_SUFFIXES = ['.fal.ai', '.fal.run']

/**
 * Request/response headers that must not be forwarded verbatim.
 * `content-length` / `content-encoding` are recomputed by the runtime, and hop
 * -by-hop headers should not be proxied.
 */
const EXCLUDED_HEADERS = new Set(['content-length', 'content-encoding', 'transfer-encoding'])

/**
 * A fal.ai server-side proxy.
 *
 * The frontend posts to `/api/fal/proxy` with an `x-fal-target-url` header
 * naming the fal endpoint to call (e.g. the LCM image-to-image model). The
 * proxy attaches the `FAL_KEY` and forwards the request, so the key never
 * reaches the browser.
 *
 * This mirrors fal's documented proxy formula: read the target URL from the
 * `x-fal-target-url` header, validate it points at fal, forward the request
 * with the `Authorization: Key <FAL_KEY>` header injected, then relay the
 * response back unchanged.
 */
export async function handleFalProxy(request: IRequest, env: Env): Promise<Response> {
	if (request.method !== 'GET' && request.method !== 'POST') {
		return new Response('Method not allowed', { status: 405 })
	}

	const falKey = env.FAL_KEY
	if (!falKey || falKey === 'your_fal_key_here') {
		return json({ error: 'FAL_KEY is not configured. Add it to .dev.vars (see the README).' }, 500)
	}

	const targetUrl = request.headers.get(TARGET_URL_HEADER)
	if (!targetUrl) {
		return json({ error: `Missing the ${TARGET_URL_HEADER} header.` }, 400)
	}

	let parsed: URL
	try {
		parsed = new URL(targetUrl)
	} catch {
		return json({ error: `Invalid ${TARGET_URL_HEADER} header.` }, 400)
	}

	const isAllowed =
		parsed.protocol === 'https:' &&
		ALLOWED_HOST_SUFFIXES.some(
			(suffix) => parsed.hostname === suffix.slice(1) || parsed.hostname.endsWith(suffix)
		)
	if (!isAllowed) {
		return json({ error: `The ${TARGET_URL_HEADER} host is not an allowed fal domain.` }, 412)
	}

	// Copy through the incoming headers, dropping the ones the runtime manages,
	// then inject the fal credential.
	const forwardHeaders = new Headers()
	for (const [key, value] of request.headers.entries()) {
		if (EXCLUDED_HEADERS.has(key.toLowerCase())) continue
		if (key.toLowerCase() === TARGET_URL_HEADER) continue
		forwardHeaders.set(key, value)
	}
	forwardHeaders.set('authorization', `Key ${falKey}`)

	// Buffer the POST body before forwarding rather than piping `request.body`
	// through as a stream — a fully-known body is a well-behaved subrequest.
	const body = request.method === 'POST' ? await request.arrayBuffer() : undefined

	const upstream = await fetch(parsed.toString(), {
		method: request.method,
		headers: forwardHeaders,
		body,
	})

	const responseHeaders = new Headers()
	for (const [key, value] of upstream.headers.entries()) {
		if (EXCLUDED_HEADERS.has(key.toLowerCase())) continue
		responseHeaders.set(key, value)
	}

	// Buffer the upstream response before relaying it rather than passing
	// `upstream.body` through as a stream. In sync mode fal returns a single
	// complete JSON payload, so there's no streaming benefit, and returning a
	// fully-read, fixed-length body is the most robust thing for the browser to
	// consume — no half-flushed chunked stream for `response.json()` to wait on.
	const responseBody = await upstream.arrayBuffer()

	return new Response(responseBody, {
		status: upstream.status,
		statusText: upstream.statusText,
		headers: responseHeaders,
	})
}

function json(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	})
}
