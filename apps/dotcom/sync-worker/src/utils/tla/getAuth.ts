import { ClerkClient, createClerkClient } from '@clerk/backend'
import { IRequest } from 'itty-router'
import { Environment } from '../../types'

export async function getAuth(
	request: IRequest,
	env: Environment
): Promise<{ userId: string } | null> {
	if (env.TLDRAW_ENV !== 'production' && env.TEST_AUTH_SECRET) {
		const url = new URL(request.url)
		const token =
			url.searchParams.get('accessToken') ??
			request.headers.get('Authorization')?.slice('Bearer '.length)
		if (token?.startsWith(`${env.TEST_AUTH_SECRET}:`)) {
			const userId = token.slice(`${env.TEST_AUTH_SECRET}:`.length)
			return { userId }
		}
	}

	const clerk = createClerkClient({
		secretKey: env.CLERK_SECRET_KEY,
		publishableKey: env.CLERK_PUBLISHABLE_KEY,
	})

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

	const state = await clerk.authenticateRequest(cloned)
	if (!state.isSignedIn) {
		return null
	}

	const { userId } = state.toAuth()

	return { userId }
}

export type SignedInAuth = ReturnType<
	Extract<Awaited<ReturnType<ClerkClient['authenticateRequest']>>, { isSignedIn: true }>['toAuth']
>
