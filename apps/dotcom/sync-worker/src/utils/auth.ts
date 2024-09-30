import { ClerkClient, createClerkClient } from '@clerk/backend'
import { IRequest, StatusError } from 'itty-router'

export interface Auth {
	// db: Db
	// user: DatabaseTeachUser
	clerk: SignedInAuth
}

export async function auth(
	request: IRequest
	// { admin = false } = {}
): Promise<Auth> {
	const clerk = createClerkClient({
		secretKey: process.env.CLERK_SECRET_KEY,
		publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
	})

	// we can't send headers with websockets, so for those connections we need to pass the token in
	// the query string. `authenticateRequest` only works with headers/cookies though, so we need to
	// copy the query string into the headers.
	const cloned = new Request(request.url, { headers: request.headers })
	const url = new URL(cloned.url)
	if (url.searchParams.has('clerk_token')) {
		cloned.headers.set('Authorization', `Bearer ${url.searchParams.get('clerk_token')}`)
	}

	const state = await clerk.authenticateRequest(cloned)
	if (!state.isSignedIn) {
		throw new StatusError(401)
	}

	const signedIn = state.toAuth()
	// const db = new Db(env, signedIn)

	// let user = await db.getUserIfExists(signedIn.userId)
	// if (!user) {
	// 	const clerkUser = await clerk.users.getUser(signedIn.userId)
	// 	const isTldraw = !!(
	// 		clerkUser.primaryEmailAddress?.emailAddress.endsWith('@tldraw.com') &&
	// 		clerkUser.primaryEmailAddress.verification?.status === 'verified'
	// 	)
	// 	user = await db.upsertUser({ id: clerkUser.id, isTldraw })
	// }

	// if (admin && !user.isTldraw) {
	// 	throw new StatusError(403)
	// }

	return {
		// db,
		// user,
		clerk: signedIn,
	}
}

export type SignedInAuth = ReturnType<
	Extract<Awaited<ReturnType<ClerkClient['authenticateRequest']>>, { isSignedIn: true }>['toAuth']
>
