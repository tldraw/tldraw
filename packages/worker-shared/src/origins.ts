/**
 * Validates if an origin is allowed to make cross-origin requests.
 * Returns the origin if allowed, or undefined if blocked.
 *
 * @param origin - The origin header from the incoming request
 * @returns The origin string if allowed, undefined otherwise
 *
 * @example
 * ```ts
 * const origin = request.headers.get('origin')
 * const allowed = isAllowedOrigin(origin)
 * if (allowed) {
 *   // Process the request
 * }
 * ```
 *
 * @public
 */
export function isAllowedOrigin(origin: string) {
	if (!origin) return undefined
	if (origin === 'http://localhost:3000') return origin
	if (origin === 'http://localhost:5420') return origin
	if (origin === 'https://meet.google.com') return origin
	if (origin === 'https://tldraw.dev') return origin
	if (origin.endsWith('.tldraw.com')) return origin
	if (origin.endsWith('.tldraw.dev')) return origin
	if (origin.endsWith('.tldraw.club')) return origin
	if (origin.endsWith('.tldraw.xyz')) return origin
	if (origin.endsWith('.tldraw.workers.dev')) return origin
	if (origin.endsWith('-tldraw.vercel.app')) return origin
	return undefined
}

/**
 * Middleware to block requests from unknown/unauthorized origins.
 * Allows same-origin requests, auth callbacks, and requests from allowed origins.
 * Returns undefined to continue processing, or a 403 Response to block the request.
 *
 * @param request - The incoming HTTP request
 * @param env - Environment variables, must contain IS_LOCAL property
 * @returns undefined to continue, or Response with 403 status to block
 *
 * @example
 * ```ts
 * router.all('*', async (request, env) => {
 *   const blocked = await blockUnknownOrigins(request, env)
 *   if (blocked) return blocked
 *   // Continue processing...
 * })
 * ```
 *
 * @public
 */
export async function blockUnknownOrigins(
	request: Request,
	env: { IS_LOCAL?: string }
): Promise<undefined | Response> {
	// allow requests for the same origin (new rewrite routing for SPA)
	if (request.headers.get('sec-fetch-site') === 'same-origin') {
		return undefined
	}

	if (new URL(request.url).pathname === '/auth/callback') {
		// allow auth callback because we use the special cookie to verify
		// the request
		return undefined
	}

	const origin = request.headers.get('origin')

	// if there's no origin, this cannot be a cross-origin request, so we allow it.
	if (!origin) return undefined

	if (env.IS_LOCAL !== 'true' && !isAllowedOrigin(origin)) {
		console.error('Attempting to connect from an invalid origin:', origin, env, request)
		return new Response('Not allowed', { status: 403 })
	}

	// origin doesn't match, so we can continue
	return undefined
}
