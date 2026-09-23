import { createClerkClient, SessionAuthObject, verifyToken } from '@clerk/backend'
import { can } from '@tldraw/dotcom-shared'
import { IRequest, StatusError } from 'itty-router'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { isFeatureFlagEnabledForUser } from '../featureFlags'
import { getRole } from './getRole'

export async function requireAuth(request: IRequest, env: Environment): Promise<SignedInAuth> {
	const auth = await getAuth(request, env)
	if (!auth) {
		throw new StatusError(401, 'Unauthorized')
	}

	return auth
}

export function getClerkClient(env: Environment) {
	return createClerkClient({
		secretKey: env.CLERK_SECRET_KEY,
		publishableKey: env.CLERK_PUBLISHABLE_KEY,
	})
}

function getAuthorizedParties(env: Environment): string[] {
	const parties = ['https://tldraw.com', 'https://www.tldraw.com', 'https://staging.tldraw.com']
	// Only include localhost in non-production environments
	if (env.TLDRAW_ENV !== 'production') {
		parties.push('http://localhost:3000')
	}
	// For preview envs, add the preview domain
	// WORKER_NAME is like "pr-7731-tldraw-multiplayer"
	if (env.TLDRAW_ENV === 'preview' && env.WORKER_NAME) {
		const previewId = env.WORKER_NAME.replace(/-tldraw-multiplayer$/, '')
		parties.push(`https://${previewId}-preview-deploy.tldraw.com`)
	}
	return parties
}

export async function getAuth(request: IRequest, env: Environment): Promise<SignedInAuth | null> {
	const clerk = getClerkClient(env)
	const authorizedParties = getAuthorizedParties(env)

	const state = await clerk.authenticateRequest(request, { authorizedParties })
	if (state.isAuthenticated) return state.toAuth()

	// we can't send headers with websockets, so for those connections we need to pass the token in
	// the query string. `authenticateRequest` only works with headers/cookies though, so we need to
	// copy the query string into the headers.
	const cloned = new Request(request.url, { headers: request.headers })
	const url = new URL(cloned.url)
	if (!cloned.headers.has('Authorization')) {
		if (url.searchParams.has('accessToken')) {
			cloned.headers.set('Authorization', `Bearer ${url.searchParams.get('accessToken')}`)
		} else {
			return null
		}
	}

	const res = await clerk.authenticateRequest(cloned, { authorizedParties })
	if (!res.isAuthenticated) {
		return null
	}

	return res.toAuth()
}

/**
 * The `purpose` claim the `zero` Clerk JWT template mints, and which {@link getZeroAuth} requires.
 * It is what separates a token meant for these endpoints from any other token our Clerk instance
 * signs. Configured in the Clerk dashboard under JWT Templates → zero → Claims; if you rename it
 * there, the template has to carry both values until every worker is on the new name.
 */
const ZERO_TOKEN_PURPOSE = 'zero'

/**
 * Auth for the two endpoints zero-cache calls on the client's behalf (`/app/zero/query` and
 * `/app/zero/mutate`).
 *
 * These take a token minted from the `zero` Clerk JWT template rather than a session token, because
 * zero-cache holds the token for the life of a connection and reuses it for every transform and
 * push behind that connection. A session token lives 60s and browsers throttle timers in hidden
 * tabs to about once a minute, so a backgrounded tab cannot land a refresh before expiry — and an
 * expired token here doesn't fail one request, it invalidates the whole connection. That produced a
 * steady ~670 connection invalidations an hour in production.
 *
 * The trade is revocation latency: a template token isn't session-bound (no `sid`), so signing out
 * doesn't invalidate one — it stays good until it expires. That's why the template is set to 3
 * minutes rather than something longer: it only has to clear the ~1/minute timer budget, and every
 * second beyond that is revocation window bought for nothing. Scoped deliberately to these two
 * endpoints; everything else still authenticates with session tokens.
 *
 * Falls back to {@link getAuth} so a client running an older bundle, which still sends a session
 * token, keeps working across the deploy.
 */
export async function getZeroAuth(
	request: IRequest,
	env: Environment
): Promise<{ userId: string } | null> {
	const header = request.headers.get('Authorization')
	const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
	if (token) {
		try {
			// `verifyToken` accepts anything our Clerk instance signed, which is a wider door than we
			// want: a token minted from some other JWT template — the kind you hand to a third-party
			// integration — would otherwise be a valid credential for these two endpoints, mutate
			// included. The `zero` template mints `purpose: 'zero'`; nothing else does.
			const claims = await verifyToken(token, {
				secretKey: env.CLERK_SECRET_KEY,
				// holds the token to the same origin allowlist as a session token. The template stamps
				// `azp` as a default claim, and since @clerk/backend 3.11 a token without one is rejected
				// outright when `authorizedParties` is set — but this says nothing about *which* template
				// minted the token; the `purpose` check below is what gates.
				authorizedParties: getAuthorizedParties(env),
			})
			if (claims.purpose !== ZERO_TOKEN_PURPOSE) {
				throw new Error(`not a ${ZERO_TOKEN_PURPOSE}-template token`)
			}
			if (claims.sub) return { userId: claims.sub }
		} catch (e) {
			// getAuth deliberately says nothing about why it rejected a token, which made an outage
			// considerably harder to diagnose than it needed to be. Say it here.
			console.error('[zero-auth] template token rejected:', (e as Error).message)
		}
	}
	return getAuth(request, env)
}

export type SignedInAuth = Extract<SessionAuthObject, { isAuthenticated: true }>

/**
 * Why an access token was refused, as a closed vocabulary, so a caller can tell "presented nothing"
 * from "presented something bad" from "signed in and still not allowed" — three refusals that call
 * for entirely different answers, and that the MCP endpoint reports separately during the rollout.
 */
export type McpTokenRefusal = 'no_token' | 'invalid_token' | 'unconfigured' | 'not_allowlisted'

export type McpTokenAuth = { ok: true; userId: string } | { ok: false; reason: McpTokenRefusal }

export interface McpTokenOptions {
	/**
	 * Also accept the token offered as a websocket subprotocol, not the `Authorization` header alone.
	 *
	 * Opt-in per call site, because it is a credential arriving somewhere no other endpoint looks for
	 * one. The websocket handshake is the one place worth it: the browser's `WebSocket` constructor
	 * sets no request header except `Sec-WebSocket-Protocol`, so that field is the only way a client
	 * presents anything at all without putting the token in the URL — where session tokens still ride
	 * (see {@link getAuth}) and where it would land in access logs, proxy logs and anything keeping a
	 * `Referer`. The MCP endpoint itself stays header-only, and its discovery metadata says so with
	 * `bearer_methods_supported: ['header']`.
	 *
	 * This is not what a subprotocol is for, and it has a sharp edge: the server must echo the value
	 * on the 101 or the browser drops the connection (see {@link MCP_SOCKET_SUBPROTOCOL}). The
	 * cleaner answer is a ticket — POST the access token to an endpoint with a real `Authorization`
	 * header, get back a single-use ticket good for seconds, and connect with that. Nothing durable
	 * in a URL, and no field used for something it does not mean. It wants an endpoint and somewhere
	 * to keep tickets, which is the whole reason it is not what this does yet.
	 */
	allowSubprotocolToken?: boolean
}

/**
 * The user behind an OAuth access token this Clerk instance issued, for a user the
 * `mcp_server_access` flag names.
 *
 * Separate from {@link getAuth} rather than folded into it, and opted into one route at a time: a
 * session token is a credential the user's browser holds for tldraw.com itself, while this is one
 * the user handed to somebody else's software — Claude, ChatGPT, Cursor — for a stated purpose.
 * Accepting both everywhere would silently let every endpoint that takes a session token be driven
 * by an agent, which is a decision each route should make on its own.
 *
 * Verified by @clerk/backend against the Clerk instance the secret key names: signature (against a
 * JWKS the SDK fetches from the Backend API once and caches), `sub`, lifetime and token type. Not
 * `verifyToken`, which is for *session* tokens and refuses an access token on its header alone;
 * `acceptsToken: 'oauth_token'` is the path that expects RFC 9068's `at+jwt`.
 *
 * `typ` is load-bearing rather than pedantry, and is the only thing separating an OAuth access token
 * from a Clerk *session* JWT. Clerk stamps no `aud` on either, so nothing here can tell them apart by
 * audience, and a session token — `typ: JWT` — would otherwise be a valid bearer token. That would
 * make an ordinary tldraw.com website credential enough to drive an agent-facing endpoint, and the
 * consent step an agent walks the user through decoration. The SDK answers one with
 * `token-type-mismatch`.
 *
 * No `iss` check, where the jose verifier this replaced pinned one: the key set is the accepting
 * instance's own, so a token any other issuer signed fails on signature.
 *
 * There is deliberately no check that the token was issued for the resource being called, and its
 * absence is the part of this function most likely to look like an oversight.
 *
 * RFC 8707 would bind a token to the resource it was minted for, via `aud`, so a token the user
 * granted to somebody else's MCP server could not be replayed against ours. Clerk does not implement
 * it: it stamps no `aud` on an access token whether or not the client sends a `resource` parameter,
 * so there is nothing here to compare. An earlier version of this check did it anyway and, because
 * production enforced unconditionally, would have refused every token ever issued.
 *
 * What closes the hole instead lives on the authorization server, where the client registry is:
 * Clerk's `client_id_metadata_documents_only_allow_pre_registered_clients` refuses to issue tokens to
 * CIMD clients nobody approved, so a client we have never heard of cannot obtain a token for our
 * users in the first place. Approving one is a Clerk dashboard action, not a deploy.
 *
 * The consequence to keep in mind: that setting is the whole of the protection, and it is invisible
 * from this repository. If it is ever turned off, every self-registered client in the world can call
 * these endpoints with a token its user consented to for something else entirely. A `client_id`
 * allowlist here would be the belt to that setting's braces if we ever want one — the claim is on
 * every token.
 */
export async function getMcpTokenAuth(
	request: IRequest,
	env: Environment,
	{ allowSubprotocolToken = false }: McpTokenOptions = {}
): Promise<McpTokenAuth> {
	const token =
		getBearerToken(request) ?? (allowSubprotocolToken ? getSubprotocolToken(request) : null)
	if (!token) return { ok: false, reason: 'no_token' }

	if (!env.CLERK_SECRET_KEY) {
		// Our misconfiguration rather than a bad token, so it is logged as one. Callers still answer it
		// like any other refusal: naming the difference would describe the deployment to someone
		// guessing at it.
		console.error('MCP token verification is unconfigured: no Clerk instance to verify against')
		return { ok: false, reason: 'unconfigured' }
	}

	const state = await getClerkClient(env).authenticateRequest(
		// The SDK parses `Authorization` itself and only strips an exact `Bearer ` prefix; handing it the
		// token getBearerToken already accepted keeps a lowercase or padded scheme working, and keeps the
		// body and every other header out of its hands.
		new Request(request.url, { headers: { authorization: `Bearer ${token}` } }),
		{ acceptsToken: 'oauth_token' }
	)
	if (!state.isAuthenticated) {
		// The SDK's reason and message only, never the token or its decoded payload: `sub`, `client_id`,
		// `scope` and `jti` are every one of the things a refusal is careful not to disclose, written to
		// a log with a wider audience than the caller.
		console.error('MCP token verification failed:', state.reason, state.message)
		return { ok: false, reason: 'invalid_token' }
	}

	const userId = state.toAuth().userId
	if (!(await isFeatureFlagEnabledForUser(env, 'mcp_server_access', userId))) {
		return { ok: false, reason: 'not_allowlisted' }
	}

	return { ok: true, userId }
}

/** The bearer token on a request, if it carries one. */
export function getBearerToken(request: Request): string | null {
	const header = request.headers.get('authorization')
	if (!header) return null
	const match = /^Bearer\s+(.+)$/i.exec(header.trim())
	return match ? match[1].trim() : null
}

/**
 * The subprotocol an MCP client offers to carry its access token, and the value the server echoes to
 * accept it.
 *
 * The echo is not optional: a browser closes a connection whose offered subprotocol the server did
 * not select, so every 101 answering such a handshake has to name this back — including the ones
 * that close the socket immediately, since the client still completes the handshake to read why.
 */
export const MCP_SOCKET_SUBPROTOCOL = 'tldraw.bearer'

/**
 * The token offered as `Sec-WebSocket-Protocol: tldraw.bearer, <token>`.
 *
 * A Clerk access token is a JWT, and every character a JWT uses is legal in this field, so it
 * survives unencoded. Anything that is not our two-part offer reads as no token rather than a bad
 * one: a client naming some other subprotocol is not making a failed attempt at this.
 */
function getSubprotocolToken(request: IRequest): string | null {
	const offered = request.headers.get('sec-websocket-protocol')
	if (!offered) return null
	const [name, token] = offered.split(',', 2).map((part) => part.trim())
	return name === MCP_SOCKET_SUBPROTOCOL && token ? token : null
}

/**
 * Whether a user may *view* a file: they can reach it through the group that owns it, or it is
 * shared via link — in which case `sharedLinkType` is irrelevant, since a link shared for
 * editing is also one that can be viewed.
 *
 * The read-side counterpart of `hasWriteAccessToFile`, which is the same three checks plus a
 * `sharedLinkType === 'edit'` requirement. Both answer with a boolean and never distinguish "no such
 * file" from "not yours": a caller that supplies the id — the MCP server, the upload routes — must
 * not be able to probe for existence.
 *
 * Says nothing about whether the file exists, is deleted, or is a test file: a missing file is simply
 * not accessible, and callers that need to tell those apart do so through their own resolution step.
 *
 * Hands back the row it read on success, structurally the `SharedFileInfo` the thumbnail resolution
 * wants, so the caller does not immediately dial Postgres again for a strict subset of the same
 * columns. Deliberately not a licence to cache it: it is safe only for a caller re-applying the gate
 * microseconds later inside one function, which is exactly where `loadBoardSnapshot` already accepts
 * one and where the render page's own read deliberately does not.
 */
export type ReadAccessToFile =
	| { ok: true; file: { id: string; shared: boolean; isDeleted: boolean } }
	| { ok: false }

export async function hasReadAccessToFile(
	env: Environment,
	userId: string,
	fileId: string
): Promise<ReadAccessToFile> {
	const db = createPostgresConnectionPool(env, 'sync-worker/hasReadAccessToFile')

	try {
		const file = await db
			.selectFrom('file')
			.select(['id', 'owningGroupId', 'shared', 'isDeleted'])
			.where('id', '=', fileId)
			.executeTakeFirst()

		if (!file || file.isDeleted) return { ok: false }
		const granted = {
			ok: true,
			file: { id: file.id, shared: file.shared, isDeleted: false },
		} as const
		if (file.owningGroupId) {
			const role = await getRole(db, userId, file.owningGroupId)
			if (can(role, 'accessFiles')) return granted
		}
		return file.shared === true ? granted : { ok: false }
	} finally {
		await db.destroy()
	}
}

export async function requireAdminAccess(env: Environment, auth: { userId: string } | null) {
	if (!auth?.userId) {
		throw new StatusError(403, 'Unauthorized')
	}
	const user = await getClerkClient(env).users.getUser(auth.userId)
	if (
		!user.primaryEmailAddress?.emailAddress.endsWith('@tldraw.com') ||
		user.primaryEmailAddress?.verification?.status !== 'verified'
	) {
		throw new StatusError(403, 'Unauthorized')
	}
	return user
}

export async function requireAdminAccessToRequest(request: IRequest, env: Environment) {
	return requireAdminAccess(env, await requireAuth(request, env))
}
