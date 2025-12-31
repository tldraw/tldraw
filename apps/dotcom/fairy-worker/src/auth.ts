import { ClerkClient, createClerkClient } from '@clerk/backend'
import { IRequest, StatusError } from 'itty-router'
import { INTERNAL_BASE_URL } from './constants'
import { Environment } from './environment'

export async function requireAuth(
	request: Request | IRequest,
	env: Environment
): Promise<SignedInAuth> {
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

export async function getAuth(
	request: Request | IRequest,
	env: Environment
): Promise<SignedInAuth | null> {
	const clerk = getClerkClient(env)

	const state = await clerk.authenticateRequest(request as Request)
	if (state.isSignedIn) return state.toAuth()

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

	const res = await clerk.authenticateRequest(cloned)
	if (!res.isSignedIn) {
		return null
	}

	return res.toAuth()
}

export type SignedInAuth = ReturnType<
	Extract<Awaited<ReturnType<ClerkClient['authenticateRequest']>>, { isSignedIn: true }>['toAuth']
>

/**
 * Requires that the authenticated user has a verified @tldraw.com email address.
 * Throws a 403 error if the user is not authenticated or doesn't have @tldraw.com email.
 */
export async function requireAdminAccess(env: Environment, auth: { userId: string } | null) {
	if (!auth?.userId) {
		throw new StatusError(403, 'Unauthorized')
	}
	const hasAdminStatus = await isAdmin(env, auth)
	if (!hasAdminStatus) {
		throw new StatusError(403, 'Unauthorized - @tldraw.com email required')
	}
}

export async function requireFairyAccess(env: Environment, auth: { userId: string } | null) {
	if (!auth?.userId) {
		throw new StatusError(403, 'Unauthorized')
	}
	const hasFairyAccessValue = await hasFairyAccess(env, auth)
	if (!hasFairyAccessValue) {
		throw new StatusError(403, 'Unauthorized - fairy access required')
	}
}

export async function isAdmin(env: Environment, auth: { userId: string } | null) {
	if (!auth?.userId) {
		return false
	}
	const user = await getClerkClient(env).users.getUser(auth.userId)
	return !!(
		user.primaryEmailAddress?.emailAddress.endsWith('@tldraw.com') &&
		user.primaryEmailAddress?.verification?.status === 'verified'
	)
}

export async function hasFairyAccess(env: Environment, auth: { userId: string } | null) {
	if (!auth?.userId) {
		return false
	}

	const userDoId = env.TL_USER.idFromName(auth.userId)
	const userDo = env.TL_USER.get(userDoId)

	try {
		const response = await userDo.fetch(
			`${INTERNAL_BASE_URL}/app/${auth.userId}/fairy/has-access`,
			{
				method: 'GET',
			}
		)

		if (!response.ok) {
			return false
		}

		const data = (await response.json()) as { hasAccess: boolean }
		return data.hasAccess
	} catch (error) {
		console.error('Failed to check fairy access:', error)
		return false
	}
}
