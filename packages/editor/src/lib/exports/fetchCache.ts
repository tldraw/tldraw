import { FileHelpers, assert, fetch } from '@tldraw/utils'

// TODO(alex): currently, this cache will grow unbounded. we should come up with a better strategy
// for clearing items from the cache over time.
export function fetchCache<T>(cb: (response: Response) => Promise<T>, init?: RequestInit) {
	const cache = new Map<string, Promise<T | null>>()

	return async function fetchCached(url: string): Promise<T | null> {
		const existing = cache.get(url)
		if (existing) return existing

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
