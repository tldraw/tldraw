import { verifyToken } from '@clerk/backend'
import { IRequest } from 'itty-router'
import { Environment, envFlagWord, isProduction } from '../../types'
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

	// Verified against the Clerk instance's JWKS — signature and lifetime. The audience binding is
	// deliberately not delegated to verifyToken's `audience` option: that option refuses a
	// present-but-wrong `aud` inside verification, upstream of the escape hatch and the diagnostic
	// log below, and compares nothing when the `aud` is missing. `namesResource` owns the whole
	// decision instead.
	//
	// NOTE: this is the JWT path. If the Clerk OAuth authorization server is configured to issue
	// opaque access tokens instead, they cannot be verified this way and need
	// `idPOAuthAccessToken.verifySecret` from @clerk/backend v2 — this worker pins 1.23.7, which
	// has no OAuth token API at all. Confirm the token format when the Clerk instance is set up.
	let payload: Awaited<ReturnType<typeof verifyToken>>
	try {
		payload = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY })
	} catch (error) {
		// The reason a token failed is not the caller's business — an expired token and one minted for
		// somebody else's resource answer the same thing — but a client does need to know it should
		// re-authenticate rather than give up, which is what `invalid_token` says.
		console.error('MCP token verification failed:', error)
		return {
			ok: false,
			response: mcpUnauthorized(request, env, {
				error: 'invalid_token',
				description: INVALID_TOKEN_DESCRIPTION,
			}),
		}
	}
	// The try ends with verification: nothing below throws, and a future check that does should not
	// be swallowed and reported as a verification failure.

	if (!payload.sub) {
		return {
			ok: false,
			response: mcpUnauthorized(request, env, {
				error: 'invalid_token',
				description: INVALID_TOKEN_DESCRIPTION,
			}),
		}
	}

	if (!namesResource(payload.aud, resource)) {
		// Logged either way, and deliberately noisy about the audience the token did carry: the
		// expected way to see this is a Clerk instance that is not stamping the resource indicator,
		// and that diagnosis is the difference between a five-minute configuration fix and a hunt
		// through the client's OAuth flow. Logging it even when the check is not enforced is the
		// point of the escape hatch — an environment that skips the refusal still reports what it
		// would have refused, so the Clerk side can be confirmed before production meets it.
		//
		// Warn rather than error, one constant message, and a structured payload rather than a
		// string: in an environment with the hatch open this line is the steady state of every
		// successful call, not an incident, and it has to stay greppable and queryable by field.
		const enforced = isMcpTokenAudienceRequired(env)
		console.warn('MCP token audience does not name this resource', {
			aud: payload.aud ?? null,
			expected: resource,
			enforced,
		})
		if (enforced) {
			return {
				ok: false,
				response: mcpUnauthorized(request, env, {
					error: 'invalid_token',
					description: INVALID_TOKEN_DESCRIPTION,
				}),
			}
		}
	}

	const userId = payload.sub

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

/**
 * One message for every way a token can be refused. An expired token, a revoked one, a subjectless
 * one and one minted for somebody else's resource all answer the same thing: the caller cannot act
 * on the difference, and spelling it out would tell an attacker which of their guesses was closest.
 */
const INVALID_TOKEN_DESCRIPTION =
	'The access token is expired, revoked, or issued for another resource'

/**
 * Whether a token whose `aud` does not name this resource is refused, as opposed to merely logged.
 *
 * Configurable because the Clerk OAuth instance is not set up yet, and until it is there is no way to
 * know whether it stamps the resource indicator at all. Enforcing unconditionally would mean staging
 * and preview cannot exercise the MCP flow end to end until that question is settled, which is the
 * wrong order: staging is where the answer is supposed to come from.
 *
 * Three things keep the hatch from becoming the way this ships:
 *
 * - **Unset enforces.** The safe state is the one an environment lands in by accident, so a new
 *   deployment, a dropped var and a typo are all strict. Only the exact string `false` opts out —
 *   note this is the opposite parsing to `MCP_SCREENSHOT_ENABLED`, for the same reason in both cases:
 *   a stray value should fail towards the guarded state, and for that flag the guarded state is off.
 * - **Production never consults the var.** Production is the one environment where the audience
 *   binding is load-bearing, so the hatch is skipped there whatever the var says. A guard rail
 *   rather than tamper-proofing: `TLDRAW_ENV` is itself an ordinary deploy var, editable on the same
 *   dashboard screen, so opening the hatch in production takes two edits rather than zero — and only
 *   until the next deploy restores both. What actually keeps production strict is that unset
 *   enforces and neither var appears in production config.
 * - **Skipping is logged** at the call site, so an environment running without the check still tells
 *   you what it would have refused.
 *
 * Delete this once the Clerk instance is confirmed to stamp `aud`. The var is set in three places
 * that all go away with it: `[env.dev.vars]` and `[env.staging.vars]` in `wrangler.toml`, and the
 * preview deploy vars in `internal/scripts/deploy-dotcom.ts`.
 */
function isMcpTokenAudienceRequired(env: Environment): boolean {
	if (isProduction(env)) return true
	return envFlagWord(env.MCP_REQUIRE_TOKEN_AUDIENCE) !== 'false'
}

/**
 * Whether a token's `aud` names this resource (RFC 8707) — what stops a token the user granted to
 * some other MCP server being replayed against this one.
 *
 * Asserted here rather than through `verifyToken`'s `audience` option, which is deliberately not
 * passed at all, for two reasons:
 *
 * - The option compares only when the token actually carries an `aud`: @clerk/backend gates the
 *   whole comparison on `audienceList.length > 0 && audList.length > 0`, so a token with no
 *   audience passes it untouched. A Clerk *session* JWT is exactly that shape — `sub`, no `aud` —
 *   which would make a tldraw.com website credential a valid bearer here and turn the consent step
 *   an agent walks the user through into decoration.
 * - When a token carries a *wrong* `aud`, the option throws inside verification — upstream of the
 *   `MCP_REQUIRE_TOKEN_AUDIENCE` escape hatch and the diagnostic log, so the one misconfiguration
 *   the hatch exists to surface from staging's logs would drown in the generic verification
 *   failure instead.
 *
 * Compared on normalized URLs rather than raw strings: the enforcing comparison first runs for real
 * in production, where a cosmetic difference between what Clerk stamps and `MCP_SERVER_URL` — host
 * case, a default port, a trailing slash — must not refuse every token with no runtime lever.
 */
function namesResource(aud: unknown, resource: string): boolean {
	const expected = normalizeResourceUrl(resource)
	if (!expected) return false
	if (typeof aud === 'string') return normalizeResourceUrl(aud) === expected
	if (Array.isArray(aud)) {
		return aud.some(
			(entry) => typeof entry === 'string' && normalizeResourceUrl(entry) === expected
		)
	}
	return false
}

/**
 * `new URL` lowercases the scheme and host and drops a default port; the trailing slash is stripped
 * here, since `…/mcp` and `…/mcp/` name the same resource. A value that does not parse as a URL
 * cannot name this resource at all.
 */
function normalizeResourceUrl(value: string): string | null {
	try {
		return new URL(value).href.replace(/\/+$/, '')
	} catch {
		return null
	}
}

function getBearerToken(request: Request): string | null {
	const header = request.headers.get('authorization')
	if (!header) return null
	const match = /^Bearer\s+(.+)$/i.exec(header.trim())
	return match ? match[1].trim() : null
}
