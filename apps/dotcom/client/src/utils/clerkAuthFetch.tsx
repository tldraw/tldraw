import { useAuth } from '@clerk/clerk-react'
import { fetch } from '@tldraw/utils'
import { useEffect } from 'react'

type GetToken = () => Promise<string | null>

let resolveGetToken: (getToken: GetToken) => void
const getTokenReady = new Promise<GetToken>((resolve) => {
	resolveGetToken = resolve
})

/**
 * Hands Clerk's `getToken` to {@link clerkAuthFetch} once Clerk has loaded. Render it inside
 * `ClerkProvider` but outside the router: route loaders wait on it, and the router renders nothing
 * until its loaders settle.
 */
export function ClerkAuthFetchBridge() {
	const { isLoaded, getToken } = useAuth()
	useEffect(() => {
		if (isLoaded) resolveGetToken(getToken)
	}, [isLoaded, getToken])
	return null
}

/**
 * `fetch` with a fresh Clerk session token for route loaders. They run as the page loads, before
 * clerk-js has refreshed the `__session` cookie, so a cookie-only request carries a token that
 * expired while the tab was closed and the worker answers 401.
 */
export async function clerkAuthFetch(input: string, init?: RequestInit): Promise<Response> {
	const getToken = await getTokenReady
	const token = await getToken()
	const headers = new Headers(init?.headers)
	if (token) headers.set('Authorization', `Bearer ${token}`)
	return await fetch(input, { ...init, headers })
}
