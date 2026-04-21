import { FileHelpers, assert, fetch } from '@tldraw/utils'

// Best-effort memory bound; full clear on overflow trades brief re-fetch cost for simplicity.
const MAX_FETCH_CACHE_SIZE = 200

export function fetchCache<T>(cb: (response: Response) => Promise<T>, init?: RequestInit) {
	const cache = new Map<string, Promise<T | null>>()

	return async function fetchCached(url: string): Promise<T | null> {
		const existing = cache.get(url)
		if (existing) return existing
		if (cache.size >= MAX_FETCH_CACHE_SIZE) cache.clear()

		const promise = (async () => {
			try {
				const response = await fetch(url, init)
				assert(response.ok)
				return await cb(response)
			} catch (err) {
				console.error(err)
				return null
			}
		})()
		cache.set(url, promise)
		return promise
	}
}

export const resourceToDataUrl = fetchCache(async (response) => {
	return await FileHelpers.blobToDataUrl(await response.blob())
})
