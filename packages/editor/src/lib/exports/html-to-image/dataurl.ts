import { FileHelpers, assert, fetch } from '@tldraw/utils'

export function isDataUrl(url: string) {
	return url.search(/^(data:)/) !== -1
}

export function makeDataUrl(content: string, mimeType: string) {
	return `data:${mimeType};base64,${content}`
}

const cache = new Map<string, Promise<string>>()
export function resourceToDataUrl(resourceUrl: string) {
	let promise = cache.get(resourceUrl)
	if (!promise) {
		promise = (async () => {
			try {
				const response = await fetch(resourceUrl)
				assert(response.ok)
				const blob = await response.blob()
				return FileHelpers.blobToDataUrl(blob)
			} catch (err) {
				cache.delete(resourceUrl)
				throw err
			}
		})()
		cache.set(resourceUrl, promise)
	}
	return promise
}
