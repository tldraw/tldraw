import { AssetRecordType, TLAsset, fetch, getHashForString } from 'tldraw'
import { BOOKMARK_ENDPOINT } from './config'

interface ResponseBody {
	title?: string
	description?: string
	image?: string
	favicon?: string
}

export async function createAssetFromUrl({ url }: { type: 'url'; url: string }): Promise<TLAsset> {
	try {
		// First, try to get the meta data from our endpoint
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

		return {
			id: AssetRecordType.createId(getHashForString(url)),
			typeName: 'asset',
			type: 'bookmark',
			props: {
				src: url,
				description: meta.description ?? '',
				image: meta.image ?? '',
				favicon: meta.favicon ?? '',
				title: meta.title ?? '',
			},
			meta: {},
		}
	} catch (error) {
		// Otherwise, fallback to fetching data from the url

		let meta: { image: string; favicon: string; title: string; description: string }

		try {
			const resp = await fetch(url, {
				method: 'GET',
				mode: 'no-cors',
			})
			const html = await resp.text()
			const doc = new DOMParser().parseFromString(html, 'text/html')
			meta = {
				image: doc.head.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '',
				favicon:
					doc.head.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href') ??
					doc.head.querySelector('link[rel="icon"]')?.getAttribute('href') ??
					'',
				title: doc.head.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '',
				description:
					doc.head.querySelector('meta[property="og:description"]')?.getAttribute('content') ?? '',
			}
			// Resolve relative URLs
			if (meta.image.startsWith('/')) {
				const urlObj = new URL(url)
				meta.image = `${urlObj.origin}${meta.image}`
			}
		} catch (error) {
			console.error(error)
			meta = { image: '', favicon: '', title: '', description: '' }
		}

		// Create the bookmark asset from the meta
		return {
			id: AssetRecordType.createId(getHashForString(url)),
			typeName: 'asset',
			type: 'bookmark',
			props: {
				src: url,
				image: meta.image,
				favicon: meta.favicon,
				title: meta.title,
				description: meta.description,
			},
			meta: {},
		}
	}
}
