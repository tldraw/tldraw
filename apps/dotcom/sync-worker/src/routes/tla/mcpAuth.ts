import { verifyToken } from '@clerk/backend'
import { IRequest } from 'itty-router'
import { Environment } from '../../types'
import { isFeatureFlagEnabledForUser } from '../../utils/featureFlags'

// The OAuth 2.1 resource-server half of the board screenshot MCP server: discovery metadata, bearer
// token verification, and the feature flag gate that decides which authenticated users are let in.
// The authorization server itself is Clerk — this worker never issues a token, only checks one.
//
// Why a resource server at all, rather than the session cookie the rest of the worker uses: the
// callers here are Claude, ChatGPT and Cursor, which cannot hold a tldraw.com session. MCP's
// authorization flow is how they sign a user in on their own, and it is built on OAuth 2.1.

/**
 * The MCP endpoint's public path, including the `/api` prefix that is applied upstream and stripped
 * before the router sees it (see the worker's `fetch`). The public URL is the resource identifier
 * clients authenticate against, so this is the form that appears in metadata and in `aud` claims —
 * not the `/app/mcp` the router matches.
 */
export const MCP_RESOURCE_PATH = '/api/app/mcp'

/**
 * Where protected resource metadata lives, per RFC 9728: the resource's path, appended to
 * `/.well-known/oauth-protected-resource` at the resource's own origin.
 *
 * At the origin, which is why this needs its own route in `wrangler.toml` — the worker is otherwise
 * only routed `www.tldraw.com/api/*`, and a client that cannot fetch this simply never discovers
 * where to authenticate. That failure is silent on our side: it produces no request to log.
 */
export const MCP_PROTECTED_RESOURCE_METADATA_PATH = `/.well-known/oauth-protected-resource${MCP_RESOURCE_PATH}`

/**
 * The resource identifier this server accepts tokens for (RFC 8707). Tokens minted for anything else
 * are rejected, so a token a user granted to some other MCP server cannot be replayed against this
 * one.
 *
 * Deployments set `MCP_SERVER_URL` explicitly rather than letting this be derived from the request,
 * because the derivation reads the `Host` header: a request carrying a forged one would otherwise
 * move both the advertised metadata and the audience we check against to a host of the caller's
 * choosing. The fallback exists for local dev and tests, where there is no configured origin and no
 * attacker to speak of.
 */
export function getMcpResourceUrl(request: Request, env: Environment): string {
	if (env.MCP_SERVER_URL) return env.MCP_SERVER_URL
	return new URL(MCP_RESOURCE_PATH, new URL(request.url).origin).toString()
}

/**
 * The Clerk instance acting as our authorization server, derived from the publishable key rather
 * than configured separately.
 *
 * Derived deliberately: the same key drives token verification, so the authorization server we point
 * clients at and the one whose tokens we accept cannot drift apart. Two vars could, and the symptom
 * would be every client completing a sign-in and then being refused — with nothing in our logs
 * distinguishing it from a bad token.
 *
 * A Clerk publishable key is `pk_(test|live)_<base64 of "frontend-api-host$">`.
 */
export function getMcpAuthorizationServer(env: Environment): string | null {
	if (env.MCP_OAUTH_AUTHORIZATION_SERVER) return env.MCP_OAUTH_AUTHORIZATION_SERVER

	const key = env.CLERK_PUBLISHABLE_KEY
	if (!key) return null
	const encoded = key.replace(/^pk_(test|live)_/, '')
	if (encoded === key) return null
	try {
		const host = atob(encoded).replace(/\$$/, '')
		if (!host) return null
		return `https://${host}`
	} catch {
		return null
	}
}

/**
 * RFC 9728 protected resource metadata. Names the authorization server so a client that has only our
 * URL can find where to sign the user in.
 *
 * Cached for an hour: it changes only when the Clerk instance does, and clients fetch it on every
 * connect.
 */
export function getMcpProtectedResourceMetadata(request: IRequest, env: Environment): Response {
	const authorizationServer = getMcpAuthorizationServer(env)
	if (!authorizationServer) {
		// Nothing useful to advertise, and advertising a resource with no authorization server would
		// have clients fail further along with a less legible error than "not configured".
		return Response.json({ error: 'MCP authorization is not configured' }, { status: 503 })
	}

	return Response.json(
		{
			resource: getMcpResourceUrl(request, env),
			authorization_servers: [authorizationServer],
			bearer_methods_supported: ['header'],
			resource_documentation: 'https://tldraw.dev',
		},
		{ headers: { 'cache-control': 'public, max-age=3600' } }
	)
}

/**
 * The `401` that starts an MCP client's sign-in. The `resource_metadata` parameter is the whole
 * point of it: without that pointer a client knows only that it was refused, not where to go.
 */
export function mcpUnauthorized(
	request: Request,
	env: Environment,
	{ error, description }: { error?: string; description?: string } = {}
): Response {
	const metadataUrl = new URL(
		MCP_PROTECTED_RESOURCE_METADATA_PATH,
		getMcpResourceUrl(request, env)
	).toString()
	const params = [`resource_metadata="${metadataUrl}"`]
	if (error) params.push(`error="${error}"`)
	if (description) params.push(`error_description="${description}"`)

	return Response.json(
		{ error: error ?? 'unauthorized', error_description: description },
		{ status: 401, headers: { 'WWW-Authenticate': `Bearer ${params.join(', ')}` } }
	)
}

export type McpAuthResult = { ok: true; userId: string } | { ok: false; response: Response }

/**
 * Authenticates and authorizes one MCP request: a valid bearer token minted for this resource, for a
 * user the `mcp_server_access` flag names.
 *
 * There is no anonymous path. This endpoint used to serve any caller that named a public board, and
 * requiring a token retires that deliberately — per-IP rate limits and unattributable Browser Run
 * spend were the cost of it.
 *
 * The two refusals are kept distinct because they mean different things to a client: `401` says
 * "authenticate, here is where", which a client can act on; `403` says "you did authenticate and you
 * still may not", which it cannot, and retrying the flow would loop.
 */
export async function authenticateMcpRequest(
	request: IRequest,
	env: Environment
): Promise<McpAuthResult> {
	const token = getBearerToken(request)
	if (!token) {
		return { ok: false, response: mcpUnauthorized(request, env) }
	}

	const resource = getMcpResourceUrl(request, env)
	let userId: string
	try {
		// Verified against the Clerk instance's JWKS, with `audience` enforcing RFC 8707: a token
		// issued for another resource fails here rather than being accepted because it happens to be
		// signed by the same instance.
		//
		// NOTE: this is the JWT path. If the Clerk OAuth authorization server is configured to issue
		// opaque access tokens instead, they cannot be verified this way and need
		// `idPOAuthAccessToken.verifySecret` from @clerk/backend v2 — this worker pins 1.23.7, which
		// has no OAuth token API at all. Confirm the token format when the Clerk instance is set up.
		const payload = await verifyToken(token, {
			secretKey: env.CLERK_SECRET_KEY,
			audience: resource,
		})
		if (!payload.sub) {
			return {
				ok: false,
				response: mcpUnauthorized(request, env, {
					error: 'invalid_token',
					description: 'Token has no subject',
				}),
			}
		}
		userId = payload.sub
	} catch (error) {
		// The reason a token failed is not the caller's business — an expired token and one minted for
		// somebody else's resource answer the same thing — but a client does need to know it should
		// re-authenticate rather than give up, which is what `invalid_token` says.
		console.error('MCP token verification failed:', error)
		return {
			ok: false,
			response: mcpUnauthorized(request, env, {
				error: 'invalid_token',
				description: 'The access token is expired, revoked, or issued for another resource',
			}),
		}
	}

	if (!(await isFeatureFlagEnabledForUser(env, 'mcp_server_access', userId))) {
		// Deliberately not a 404. The endpoint's existence is already public — it is in the discovery
		// metadata this same server serves — so hiding it here would cost a legible error and conceal
		// nothing.
		return {
			ok: false,
			response: Response.json(
				{
					error: 'forbidden',
					error_description: 'This account does not have access to the tldraw MCP server yet.',
				},
				{ status: 403 }
			),
		}
	}

	return { ok: true, userId }
}

function getBearerToken(request: Request): string | null {
	const header = request.headers.get('authorization')
	if (!header) return null
	const match = /^Bearer\s+(.+)$/i.exec(header.trim())
	return match ? match[1].trim() : null
}
