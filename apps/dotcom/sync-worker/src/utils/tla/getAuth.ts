import { ClerkClient, createClerkClient } from '@clerk/backend'
import { IRequest, StatusError } from 'itty-router'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'

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

export async function getAuth(request: IRequest, env: Environment): Promise<SignedInAuth | null> {
	const clerk = getClerkClient(env)

	const state = await clerk.authenticateRequest(request)
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

export async function requireWriteAccessToFile(
	request: IRequest,
	env: Environment,
	roomId: string
) {
	const auth = await requireAuth(request, env)

	const db = createPostgresConnectionPool(env, 'sync-worker/hasWriteAccessToFile')

	try {
		const file = await db
			.selectFrom('file')
			.select('ownerId')
			.select('shared')
			.select('sharedLinkType')
			.where('id', '=', roomId)
			.executeTakeFirst()

		if (!file) {
			throw new StatusError(404, 'File not found')
		}

		// If the user is the owner of the file, they have write access
		if (file.ownerId === auth.userId) {
			return
		}

		// If the file is not shared, the user does not have write access
		if (!file.shared) {
			throw new StatusError(403, 'File is not shared')
		}

		// If the file is shared but not for editing, deny access
		if (file.sharedLinkType !== 'edit') {
			throw new StatusError(403, 'File is shared but not for editing')
		}

		// Check if user is a collaborator
		const fileState = await db
			.selectFrom('file_state')
			.select('fileId')
			.where('fileId', '=', roomId)
			.where('userId', '=', auth.userId)
			.executeTakeFirst()

		if (fileState) {
			return
		}

		throw new StatusError(403, 'User does not have write access to this file')
	} finally {
		// Ensure database connection is properly closed
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
