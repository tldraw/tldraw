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
	if (origin === 'https://tldraw.com') return origin
	if (origin.endsWith('.tldraw.com')) return origin
	if (origin.endsWith('.tldraw.dev')) return origin
	if (origin.endsWith('.tldraw.club')) return origin
	if (origin.endsWith('.tldraw.xyz')) return origin
	if (origin.endsWith('.tldraw.workers.dev')) return origin
	if (origin.endsWith('-tldraw.vercel.app')) return origin
	if (origin === 'https://tldrawusercontent.com') return origin
	if (origin.endsWith('.tldrawusercontent.com')) return origin
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
	const secFetchSite = request.headers.get('sec-fetch-site')

	// allow requests for the same origin (new rewrite routing for SPA)
	if (secFetchSite === 'same-origin') {
		return undefined
	}

	if (new URL(request.url).pathname === '/auth/callback') {
		// allow auth callback because we use the special cookie to verify
		// the request
		return undefined
	}

	const origin = request.headers.get('origin')

	if (!origin) {
		// A missing Origin is not the same as "not cross-site": browsers omit it on top-level GET
		// navigations, so following a link from another site arrives here with no Origin and the
		// user's cookies attached. Sec-Fetch-Site is what separates the cases, and every browser
		// that sends cookies sends it: 'none' means the user initiated the load themselves (typed
		// URL, bookmark), and 'same-site' is another tldraw subdomain, which isAllowedOrigin trusts
		// anyway. Anything else is a cross-document request we have no allowed origin for.
		//
		// Sec-Fetch-Mode has to agree that this is a navigation. Browsers also omit Origin on every
		// no-cors subresource load, so a plain <img>/<video> pointed at another tldraw host arrives
		// with cross-site and no Origin exactly like a link click does — that's how these workers
		// serve public assets, and blocking it would 403 them.
		//
		// Callers that aren't browsers send neither header and are unaffected — and they have no
		// ambient session to borrow in the first place.
		const isCrossSiteNavigation =
			secFetchSite &&
			secFetchSite !== 'none' &&
			secFetchSite !== 'same-site' &&
			request.headers.get('sec-fetch-mode') === 'navigate'
		if (env.IS_LOCAL !== 'true' && isCrossSiteNavigation) {
			console.error('Blocking a cross-site request with no origin:', secFetchSite, request.url)
			return new Response('Not allowed', { status: 403 })
		}
		return undefined
	}

	if (env.IS_LOCAL !== 'true' && !isAllowedOrigin(origin)) {
		console.error('Attempting to connect from an invalid origin:', origin, request)
		return new Response('Not allowed', { status: 403 })
	}

	// origin doesn't match, so we can continue
	return undefined
}
