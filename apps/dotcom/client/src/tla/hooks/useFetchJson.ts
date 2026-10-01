import { useEffect, useState } from 'react'
import { fetch } from 'tldraw'

/** Returns undefined while loading and null if the request fails. */
export function useFetchJson<T>(url: string): T | null | undefined {
	const [result, setResult] = useState<{ url: string; data: T | null }>()

	useEffect(() => {
		const controller = new AbortController()
		const { signal } = controller

		async function load(): Promise<T | null> {
			const res = await fetch(url, { signal })
			return res.ok ? ((await res.json()) as T) : null
		}

		load()
			.catch(() => null)
			.then((data) => {
				if (!signal.aborted) setResult({ url, data })
			})

		return () => controller.abort()
	}, [url])

	return result?.url === url ? result.data : undefined
}
