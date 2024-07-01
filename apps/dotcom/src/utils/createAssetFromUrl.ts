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
		const fetchUrl =
			BOOKMARK_ENDPOINT +
			'?' +
			new URLSearchParams({
				url,
			}).toString()

		const meta = (await (await fetch(fetchUrl)).json()) as ResponseBody

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
			if (!meta.image.startsWith('http')) {
				meta.image = new URL(meta.image, url).href
			}
			if (!meta.favicon.startsWith('http')) {
				meta.favicon = new URL(meta.favicon, url).href
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
