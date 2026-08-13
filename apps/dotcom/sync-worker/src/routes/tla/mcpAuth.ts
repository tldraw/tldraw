import { IRequest } from 'itty-router'
import { JWTPayload, createRemoteJWKSet, jwtVerify } from 'jose'
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

	// Verified against the Clerk instance's published signing keys — signature, issuer, lifetime and
	// token type.
	//
	// Not @clerk/backend's `verifyToken`, which verifies Clerk *session* tokens and refuses an OAuth
	// access token on its header alone: `Invalid JWT type "at+jwt". Expected "JWT"`. RFC 9068 requires
	// `at+jwt` of an access token, so Clerk's authorization server and its backend SDK disagree with
	// each other and a resource server has to do this itself. #10005 tracks the v2 SDK, which handles
	// both kinds; until then this is a JWKS check like any other resource server's.
	//
	// `typ` is load-bearing rather than pedantry. Clerk stamps no `aud` on either kind of token, so the
	// audience check below cannot tell them apart, and a session JWT — `typ: JWT` — would otherwise be
	// a valid bearer token here. That would make a tldraw.com website credential enough to drive this
	// server, and the consent step an agent walks the user through decoration.
	//
	// The audience binding is deliberately not delegated to jose's `audience` option: it throws inside
	// verification, upstream of the escape hatch and the diagnostic log below, so the one
	// misconfiguration the hatch exists to surface would drown in a generic verification failure.
	// `namesResource` owns the whole decision instead.
	const issuer = getMcpAuthorizationServer(env)
	if (!issuer) {
		// Nothing to verify against. This is our misconfiguration rather than a bad token, so it is
		// logged as one — but the caller is told only what every other refusal tells it, since naming
		// the difference would describe our deployment to someone guessing at it.
		console.error(
			'MCP token verification is unconfigured: no authorization server to verify against'
		)
		return {
			ok: false,
			response: mcpUnauthorized(request, env, {
				error: 'invalid_token',
				description: INVALID_TOKEN_DESCRIPTION,
			}),
		}
	}

	let payload: JWTPayload
	try {
		;({ payload } = await jwtVerify(token, getClerkJwks(issuer), {
			issuer,
			typ: 'at+jwt',
			// What @clerk/backend allowed by default, kept so swapping the verifier does not quietly
			// start refusing tokens on a worker whose clock runs a second or two fast.
			clockTolerance: 5,
		}))
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
 * The Clerk instance's public signing keys, one key set per issuer, held at module scope.
 *
 * `createRemoteJWKSet` caches the keys it fetches and goes back to Clerk only when a token names a
 * key it has not seen, which is what makes Clerk's key rotation survivable without a deploy. That
 * only holds if the key set outlives the request: built per call it would fetch JWKS on every single
 * MCP request, adding a round trip to Clerk in front of each one.
 *
 * Keyed by issuer because a preview, staging and production worker each authenticate against a
 * different Clerk instance, and the same module is deployed to all three.
 */
const clerkJwksByIssuer = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

function getClerkJwks(issuer: string) {
	const existing = clerkJwksByIssuer.get(issuer)
	if (existing) return existing

	const jwks = createRemoteJWKSet(new URL('/.well-known/jwks.json', issuer))
	clerkJwksByIssuer.set(issuer, jwks)
	return jwks
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
 * Configurable because it was unknown, when this was written, whether Clerk stamps the resource
 * indicator. It is now known and the answer is no: a Clerk OAuth access token carries `iss`, `sub`,
 * `client_id`, `scope`, `jti` and its lifetimes, and no `aud` — whether or not the client sends an
 * RFC 8707 `resource` parameter on the authorization request. Every token therefore reaches
 * `namesResource` with nothing to match, and the hatch is the only reason any environment works.
 *
 * That turns this from a temporary hatch into an open decision. Production does not consult the var,
 * so as things stand it would refuse every token; whatever replaces the binding — Clerk's
 * `client_id_metadata_documents_only_allow_pre_registered_clients`, a `client_id` allowlist here, or
 * RFC 8707 support from Clerk — has to be settled before this endpoint is enabled there.
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
 * Delete this once the binding question above is settled, whichever way it goes. The var is set in
 * three places that all go away with it: `[env.dev.vars]` and `[env.staging.vars]` in
 * `wrangler.toml`, and the preview deploy vars in `internal/scripts/deploy-dotcom.ts`.
 */
function isMcpTokenAudienceRequired(env: Environment): boolean {
	if (isProduction(env)) return true
	return envFlagWord(env.MCP_REQUIRE_TOKEN_AUDIENCE) !== 'false'
}

/**
 * Whether a token's `aud` names this resource (RFC 8707) — what stops a token the user granted to
 * some other MCP server being replayed against this one.
 *
 * Asserted here rather than through jose's `audience` option, which is deliberately not passed at
 * all: that option throws inside verification for a wrong `aud` and a missing one alike — upstream of
 * the `MCP_REQUIRE_TOKEN_AUDIENCE` escape hatch and the diagnostic log — so the one misconfiguration
 * the hatch exists to surface from staging's logs would drown in a generic verification failure
 * instead.
 *
 * This is not what keeps a Clerk *session* JWT out, though it reads like it once did: Clerk stamps no
 * `aud` on an OAuth access token either, so the two shapes are indistinguishable here. The `typ:
 * 'at+jwt'` assertion in verification is what separates them.
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
