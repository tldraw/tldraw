import { ClerkClient, createClerkClient, verifyToken } from '@clerk/backend'
import { can } from '@tldraw/dotcom-shared'
import { IRequest, StatusError } from 'itty-router'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
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
	if (state.isSignedIn) return state.toAuth() as SignedInAuth

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
	if (!res.isSignedIn) {
		return null
	}

	return res.toAuth() as SignedInAuth
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
				// holds the token to the same origin allowlist as a session token when it carries an
				// `azp`; Clerk skips the check entirely on a token without one, so this narrows the
				// door rather than closing it — the `purpose` check below is what actually gates.
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

export type SignedInAuth = ReturnType<
	Extract<Awaited<ReturnType<ClerkClient['authenticateRequest']>>, { isSignedIn: true }>['toAuth']
> & { userId: string }

/**
 * Whether a user may *view* a file: they can reach it through the group that owns it, or it is
 * shared via link — in which case `sharedLinkType` is irrelevant, since a link shared for
 * editing is also one that can be viewed.
 *
 * The read-side counterpart of `requireWriteAccessToFile`, which is the same two checks plus a
 * `sharedLinkType === 'edit'` requirement. Kept as a separate function rather than a parameter on
 * that one, because the two differ in how they answer as well as what they ask: this returns a
 * boolean where that throws a `StatusError` naming the reason. A caller that must not reveal whether
 * a file exists — the MCP server, where the caller supplies the id — cannot use a helper that
 * distinguishes 404 from 403 for it.
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
