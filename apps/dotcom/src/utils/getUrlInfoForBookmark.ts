import { TLUrlInfoForBookmark, fetch } from 'tldraw'
import { BOOKMARK_ENDPOINT } from './config'

interface ResponseBody {
	title?: string
	description?: string
	image?: string
	favicon?: string
}

export async function getUrlInfoForBookmark(url: string): Promise<TLUrlInfoForBookmark> {
	// First, try to get the meta data from our endpoint
	try {
		const meta = (await (
			await fetch(BOOKMARK_ENDPOINT, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					url,
				}),
			})
		).json()) as ResponseBody

		return meta as TLUrlInfoForBookmark
	} catch (err) {
		console.error(err)
		try {
			const resp = await fetch(url, {
				method: 'GET',
				mode: 'no-cors',
			})
			const html = await resp.text()
			const doc = new DOMParser().parseFromString(html, 'text/html')
			const meta = {
				image: doc.head.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '',
				favicon:
					doc.head.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href') ??
					doc.head.querySelector('link[rel="icon"]')?.getAttribute('href') ??
					'',
				title: doc.head.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '',
				description:
					doc.head.querySelector('meta[property="og:description"]')?.getAttribute('content') ?? '',
			}
			if (meta.image.startsWith('/')) {
				meta.image = new URL(meta.image, url).href
			}
			if (meta.favicon.startsWith('/')) {
				meta.favicon = new URL(meta.favicon, url).href
			}

			return meta
		} catch (err) {
			console.error(err)
			return {
				image: '',
				favicon: '',
				title: '',
				description: '',
			}
		}
	}
}
