import { IRequest } from 'itty-router'
import { JWTPayload, createRemoteJWKSet, jwtVerify } from 'jose'
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
 * clients authenticate against, so this is the form that appears in discovery metadata — not the
 * `/app/mcp` the router matches.
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
 * This server's own identifier: what RFC 9728 metadata advertises as the resource, and what the
 * `WWW-Authenticate` challenge points a client at.
 *
 * Not a test applied to incoming tokens, despite RFC 8707 intending exactly that — see
 * `authenticateMcpRequest` for why there is no audience check and what stands in for one.
 *
 * Deployments set `MCP_SERVER_URL` explicitly rather than letting this be derived from the request,
 * because the derivation reads the `Host` header: a request carrying a forged one would otherwise
 * move the advertised metadata and the challenge pointer to a host of the caller's choosing, which
 * is how a client gets aimed at an authorization server that is not ours. The fallback exists for
 * local dev and tests, where there is no configured origin and no attacker to speak of.
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
 * CORS for the MCP endpoint and its discovery metadata, which are deliberately not held to the
 * worker's origin allowlist.
 *
 * That allowlist exists to stop a page on somebody else's site from riding a visitor's tldraw.com
 * *cookie*. This endpoint has no cookie to ride — it authenticates a bearer token and nothing else —
 * so an origin check buys nothing here and costs real clients. A browser-context MCP client (the
 * Inspector on `localhost:6274`, a web connector fetching directly) is on no allowlist and never will
 * be, and what it gets instead of a legible refusal is a bare `403 Not allowed` carrying no CORS
 * headers at all: indistinguishable from "there is no MCP server here". That is precisely the silent
 * discovery failure the extra `wrangler.toml` route exists to prevent, moved one layer further in.
 *
 * Clients holding no `Origin` at all — Claude Desktop, `mcp-remote`, Cursor — were always fine, which
 * is why this is easy to miss: testing with one of them proves nothing about the others.
 */
export const MCP_CORS_HEADERS: Record<string, string> = {
	// Safe as `*` precisely because there are no credentials in play: nothing here reads a cookie, and
	// a bearer token is something the client already holds rather than something the browser would
	// attach on its behalf. `*` and credentials are mutually exclusive, and we want the former.
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers':
		'authorization, content-type, mcp-protocol-version, mcp-method, mcp-name, mcp-session-id',
	// The whole content of a 401 is its `WWW-Authenticate` challenge — without it a browser client can
	// see that it was refused but not the `resource_metadata` pointer telling it where to sign in, so
	// it cannot start the flow the refusal is inviting.
	'Access-Control-Expose-Headers': 'WWW-Authenticate',
	'Access-Control-Max-Age': '86400',
}

/**
 * Stamps the MCP CORS headers onto a response. Set rather than appended, and set before the worker's
 * own `corsify` runs — which returns a response untouched once it already carries an
 * `Access-Control-Allow-Origin`, so this wins without having to be special-cased there.
 */
export function withMcpCors(response: Response): Response {
	const corsified = new Response(response.body, response)
	for (const [header, value] of Object.entries(MCP_CORS_HEADERS)) {
		corsified.headers.set(header, value)
	}
	return corsified
}

/**
 * The preflight answer for the MCP routes. Registered ahead of the router's shared `preflight`, which
 * answers from the origin allowlist and so would hand a browser client a 204 with no
 * `Access-Control-Allow-Origin` — a refusal it can't read either.
 */
export function mcpCorsPreflight(): Response {
	return withMcpCors(new Response(null, { status: 204 }))
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

/**
 * Why a request was turned away, as a closed vocabulary. Carried on the refusal so the route can put
 * it on a datapoint: during a flag-gated rollout the number that matters most is how many callers are
 * being refused and *which* kind of no they got — "not signed in" and "signed in, not on the list"
 * call for entirely different responses — and neither was visible anywhere, since the per-call event
 * is written by the dispatcher, which a refused request never reaches.
 *
 * Written by the route rather than here, which is where every other MCP datapoint is written and
 * which keeps this module free of a dependency on the one that imports it.
 */
export type McpAuthRefusal = 'no_token' | 'invalid_token' | 'unconfigured' | 'not_allowlisted'

export type McpAuthResult =
	| { ok: true; userId: string }
	| { ok: false; response: Response; reason: McpAuthRefusal }

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
	// One 401 for every way a token can be refused, built once. The reason rides on the result for
	// telemetry; the *response* says the same thing whichever it was, deliberately — see
	// INVALID_TOKEN_DESCRIPTION.
	const invalidToken = (reason: McpAuthRefusal): McpAuthResult => ({
		ok: false,
		reason,
		response: mcpUnauthorized(request, env, {
			error: 'invalid_token',
			description: INVALID_TOKEN_DESCRIPTION,
		}),
	})

	const token = getBearerToken(request)
	if (!token) {
		// No `error` parameter: nothing was presented, so there is nothing to call invalid, and a bare
		// challenge is what tells a first-contact client to go and authenticate.
		return { ok: false, reason: 'no_token', response: mcpUnauthorized(request, env) }
	}

	// Verified against the Clerk instance's published signing keys — signature, issuer, lifetime and
	// token type.
	//
	// Not @clerk/backend's `verifyToken`, which verifies Clerk *session* tokens and refuses an OAuth
	// access token on its header alone: `Invalid JWT type "at+jwt". Expected "JWT"`. RFC 9068 requires
	// `at+jwt` of an access token, so Clerk's authorization server and its backend SDK disagree with
	// each other and a resource server has to do this itself. #10005 tracks the v2 SDK, which handles
	// both kinds; until then this is a JWKS check like any other resource server's.
	//
	// `typ` is load-bearing rather than pedantry, and is the only thing separating an OAuth access token
	// from a Clerk *session* JWT. Clerk stamps no `aud` on either, so nothing here can tell them apart
	// by audience, and a session token — `typ: JWT` — would otherwise be a valid bearer token. That
	// would make an ordinary tldraw.com website credential enough to drive this server, and the consent
	// step an agent walks the user through decoration.
	const issuer = getMcpAuthorizationServer(env)
	if (!issuer) {
		// Nothing to verify against. This is our misconfiguration rather than a bad token, so it is
		// logged as one — but the caller is told only what every other refusal tells it, since naming
		// the difference would describe our deployment to someone guessing at it.
		console.error(
			'MCP token verification is unconfigured: no authorization server to verify against'
		)
		return invalidToken('unconfigured')
	}

	let payload: JWTPayload
	try {
		;({ payload } = await jwtVerify(token, getClerkJwks(issuer), {
			issuer,
			typ: 'at+jwt',
			// jose enforces only the claims it is told to require, so an access token minted without an
			// `exp` would verify here and then never expire. Clerk stamps one on every token today, which
			// is exactly what makes this the kind of thing to state rather than rely on.
			requiredClaims: ['exp'],
			// What @clerk/backend allowed by default, kept so swapping the verifier does not quietly
			// start refusing tokens on a worker whose clock runs a second or two fast.
			clockTolerance: 5,
		}))
	} catch (error) {
		// The reason a token failed is not the caller's business — an expired token and one minted for
		// somebody else's resource answer the same thing — but a client does need to know it should
		// re-authenticate rather than give up, which is what `invalid_token` says.
		//
		// The message only, never the error object: jose hangs the decoded `payload` off its errors, so
		// logging the error logs `sub`, `client_id`, `scope` and `jti` — every one of the things the
		// response above is careful not to disclose, written to a log with a wider audience than the
		// caller.
		console.error(
			'MCP token verification failed:',
			error instanceof Error ? error.message : String(error)
		)
		return invalidToken('invalid_token')
	}
	// The try ends with verification: nothing below throws, and a future check that does should not
	// be swallowed and reported as a verification failure.

	if (!payload.sub) {
		return invalidToken('invalid_token')
	}

	// There is deliberately no check here that this token was issued for *this* resource, and its
	// absence is the part of this file most likely to look like an oversight.
	//
	// RFC 8707 would bind a token to the resource it was minted for, via `aud`, so a token the user
	// granted to somebody else's MCP server could not be replayed against ours. Clerk does not
	// implement it: it stamps no `aud` on an access token whether or not the client sends a `resource`
	// parameter, so there is nothing here to compare. An earlier version of this file checked anyway
	// and, because production enforced unconditionally, would have refused every token ever issued.
	//
	// What closes the hole instead lives on the authorization server, where the client registry is:
	// Clerk's `client_id_metadata_documents_only_allow_pre_registered_clients` refuses to issue tokens
	// to CIMD clients nobody approved, so a client we have never heard of cannot obtain a token for our
	// users in the first place. Approving one is a Clerk dashboard action, not a deploy.
	//
	// The consequence to keep in mind: that setting is the whole of the protection, and it is invisible
	// from this repository. If it is ever turned off, every self-registered client in the world can
	// call this endpoint with a token its user consented to for something else entirely. A `client_id`
	// allowlist here would be the belt to that setting's braces if we ever want one — the claim is on
	// every token.

	const userId = payload.sub

	if (!(await isFeatureFlagEnabledForUser(env, 'mcp_server_access', userId))) {
		// Deliberately not a 404. The endpoint's existence is already public — it is in the discovery
		// metadata this same server serves — so hiding it here would cost a legible error and conceal
		// nothing.
		return {
			ok: false,
			reason: 'not_allowlisted',
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
 * One message for every way a token can be refused. An expired token, one signed by another Clerk
 * instance, a session token wearing the wrong `typ` and a subjectless one all answer the same thing:
 * the caller cannot act on the difference, and spelling it out would tell an attacker which of their
 * guesses was closest.
 */
const INVALID_TOKEN_DESCRIPTION =
	'The access token is expired, revoked, or issued for another resource'

function getBearerToken(request: Request): string | null {
	const header = request.headers.get('authorization')
	if (!header) return null
	const match = /^Bearer\s+(.+)$/i.exec(header.trim())
	return match ? match[1].trim() : null
}
