/**
 * Creates a standardized 404 Not Found HTTP response with JSON error format.
 *
 * This function returns a consistent error response format used across tldraw's
 * Cloudflare Workers infrastructure. It's designed to be used in API routes when
 * requested resources cannot be found or when fallback handling is needed.
 *
 * @returns A Response object with status 404 and JSON body containing error message
 *
 * @example
 * ```ts
 * import { notFound } from '@tldraw/worker-shared'
 *
 * router.get('/api/resource/:id', (request) => {
 *   const { id } = request.params
 *   const resource = getResource(id)
 *
 *   if (!resource) {
 *     return notFound() // Returns { "error": "Not found" } with 404 status
 *   }
 *
 *   return Response.json(resource)
 * })
 *
 * // Also commonly used as fallback for unmatched routes
 * router.all('*', () => notFound())
 * ```
 *
 * @public
 */
export function notFound() {
	return Response.json({ error: 'Not found' }, { status: 404 })
}

/**
 * Creates a standardized 403 Forbidden HTTP response with JSON error format.
 *
 * This function returns a consistent error response format used across tldraw's
 * Cloudflare Workers infrastructure. It's designed to be used in API routes when
 * access to a resource is denied due to insufficient permissions or authorization
 * failures.
 *
 * @returns A Response object with status 403 and JSON body containing error message
 *
 * @example
 * ```ts
 * import { forbidden } from '@tldraw/worker-shared'
 *
 * router.get('/api/admin/:id', (request) => {
 *   const { id } = request.params
 *   const user = getCurrentUser(request)
 *
 *   if (!user.isAdmin) {
 *     return forbidden() // Returns { "error": "Forbidden" } with 403 status
 *   }
 *
 *   return Response.json(getAdminData(id))
 * })
 *
 * // Can also be used for API key validation
 * router.put('/api/protected', (request) => {
 *   const apiKey = request.headers.get('Authorization')
 *
 *   if (!isValidApiKey(apiKey)) {
 *     return forbidden()
 *   }
 *
 *   // Process protected operation
 * })
 * ```
 *
 * @public
 */
export function forbidden() {
	return Response.json({ error: 'Forbidden' }, { status: 403 })
}
