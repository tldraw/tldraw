import { IRequest } from 'itty-router'
import { Environment } from '../../types'
import { getMcpTokenAuth, type McpTokenRefusal } from '../../utils/tla/getAuth'

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
 * The path-less form of the above, which the MCP authorization spec tells clients to fall back to
 * when the path-derived URL 404s.
 *
 * Served because clients actually do this, not because the origin is itself a protected resource:
 * `www.tldraw.com` is a web app, and the only OAuth-protected thing on it is the MCP server. Both
 * URLs therefore answer with the same document, whose `resource` stays `MCP_RESOURCE_PATH` — a
 * client that fell back to this path was asking about that resource anyway, and pointing it at the
 * origin instead would advertise a resource no token is ever minted for.
 */
export const MCP_PROTECTED_RESOURCE_METADATA_FALLBACK_PATH = '/.well-known/oauth-protected-resource'

/**
 * The scopes a client should ask for, named in both the `WWW-Authenticate` challenge and the RFC
 * 9728 metadata.
 *
 * Stated rather than left to the client, because a client that is told nothing guesses, and Claude's
 * hosted connectors guess by requesting every scope the authorization server advertises. Clerk
 * advertises six — `public_metadata` and `private_metadata` among them — and grants each client a
 * subset, so an unstated scope list had Claude asking for two it was never granted and Clerk
 * refusing the whole request with `invalid_scope`, before the consent screen and before any request
 * reached this worker. Claude Code was unaffected only because it sends no `scope` at all and gets
 * Clerk's configured defaults.
 *
 * What that cost, and the reason this is worth stating even though nothing here reads a scope: the
 * only fix available from the dashboard was granting Claude the two metadata scopes, widening what
 * its tokens can reach in Clerk to make an over-request legal. Naming the four here is what makes
 * revoking them possible.
 *
 * The corollary to keep in view: a client asks for what it is offered, so anything added to this
 * list — a custom tldraw scope, say — is requested by every client immediately and refused for every
 * one not granted it on the authorization server first.
 *
 * These four are what the Clerk CIMD clients are granted. Narrower would serve: nothing here reads a
 * scope, and `sub` — all this server takes from a token — rides on `openid` alone, with
 * `offline_access` for the refresh token. `profile` and `email` are kept because they are what
 * Clerk's defaults already hand Claude Code, and matching them keeps one behaviour across clients
 * rather than two.
 */
export const MCP_SCOPES = ['openid', 'profile', 'email', 'offline_access'] as const

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
 * Derived deliberately: the instance it names is the one whose secret key verifies tokens, so the
 * authorization server we point clients at and the one whose tokens we accept cannot drift apart
 * without the two Clerk keys themselves disagreeing. Two vars could drift on their own, and the symptom
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
			scopes_supported: MCP_SCOPES,
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
	// `scope` before the error parameters because it is the one a first-contact client acts on: it is
	// what Claude's hosted connectors read to decide what to ask Clerk for, and without it they ask
	// for everything Clerk advertises. See MCP_SCOPES.
	const params = [`resource_metadata="${metadataUrl}"`, `scope="${MCP_SCOPES.join(' ')}"`]
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
export type McpAuthRefusal = McpTokenRefusal

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

	if (!env.CLERK_SECRET_KEY || !getMcpAuthorizationServer(env)) {
		// Nothing to verify against, or nothing a client could have been sent to. This is our
		// misconfiguration rather than a bad token, so it is logged as one — but the caller is told only
		// what every other refusal tells it, since naming the difference would describe our deployment
		// to someone guessing at it.
		console.error('MCP token verification is unconfigured: no Clerk instance to verify against')
		return invalidToken('unconfigured')
	}

	const result = await getMcpTokenAuth(request, env)
	if (result.ok) return { ok: true, userId: result.userId }

	switch (result.reason) {
		case 'no_token':
			// No `error` parameter: nothing was presented, so there is nothing to call invalid, and a
			// bare challenge is what tells a first-contact client to go and authenticate.
			return { ok: false, reason: 'no_token', response: mcpUnauthorized(request, env) }
		case 'not_allowlisted':
			// Deliberately not a 404. The endpoint's existence is already public — it is in the discovery
			// metadata this same server serves — so hiding it here would cost a legible error and conceal
			// nothing.
			//
			// And deliberately not a 401: `403` says "you did authenticate and you still may not", which
			// a client cannot act on, where retrying the sign-in flow would loop.
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
		default:
			// The reason a token failed is not the caller's business — an expired token and one minted
			// for somebody else's resource answer the same thing — but a client does need to know it
			// should re-authenticate rather than give up, which is what `invalid_token` says. The
			// reason it carries is for telemetry, and separates a bad token from our own
			// misconfiguration.
			return invalidToken(result.reason)
	}
}

/**
 * One message for every way a token can be refused. An expired token, one signed by another Clerk
 * instance, a session token wearing the wrong `typ` and a subjectless one all answer the same thing:
 * the caller cannot act on the difference, and spelling it out would tell an attacker which of their
 * guesses was closest.
 */
const INVALID_TOKEN_DESCRIPTION =
	'The access token is expired, revoked, or issued for another resource'
