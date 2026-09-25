import { useAuth } from '@clerk/clerk-react'
import { useEffect, useState } from 'react'
import { fetch } from 'tldraw'

/**
 * Loads a staff-only API endpoint with a Clerk bearer token. Returns undefined while loading and
 * null if the request fails.
 *
 * Don't move this into a route loader: loaders run before clerk-js has refreshed the `__session`
 * cookie, so on a cold load the cookie's token has usually expired and the worker answers 401.
 * Callers render under `RequireTldrawStaff`, so Clerk has loaded by the time this runs.
 */
export function useStaffApiJson<T>(url: string): T | null | undefined {
	const { getToken } = useAuth()
	const [result, setResult] = useState<{ url: string; data: T | null }>()

	useEffect(() => {
		const controller = new AbortController()
		const { signal } = controller

		async function load(): Promise<T | null> {
			const token = await getToken()
			const res = await fetch(url, {
				signal,
				headers: token ? { Authorization: `Bearer ${token}` } : undefined,
			})
			return res.ok ? ((await res.json()) as T) : null
		}

		load()
			.catch(() => null)
			.then((data) => {
				if (!signal.aborted) setResult({ url, data })
			})

		return () => controller.abort()
	}, [url, getToken])

	return result?.url === url ? result.data : undefined
}
