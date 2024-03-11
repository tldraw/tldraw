import { AssetRecordType, TLAsset, getHashForString, truncateStringWithEllipsis } from 'tldraw'
import { BOOKMARK_ENDPOINT } from './config'

interface ResponseBody {
	title?: string
	description?: string
	image?: string
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
				title: meta.title ?? truncateStringWithEllipsis(url, 32),
			},
			meta: {},
		}
	} catch (error) {
		// Otherwise, fallback to fetching data from the url

		let meta: { image: string; title: string; description: string }

		try {
			const resp = await fetch(url, { method: 'GET', mode: 'no-cors' })
			const html = await resp.text()
			const doc = new DOMParser().parseFromString(html, 'text/html')
			meta = {
				image: doc.head.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '',
				title:
					doc.head.querySelector('meta[property="og:title"]')?.getAttribute('content') ??
					truncateStringWithEllipsis(url, 32),
				description:
					doc.head.querySelector('meta[property="og:description"]')?.getAttribute('content') ?? '',
			}
		} catch (error) {
			console.error(error)
			meta = { image: '', title: truncateStringWithEllipsis(url, 32), description: '' }
		}

		// Create the bookmark asset from the meta
		return {
			id: AssetRecordType.createId(getHashForString(url)),
			typeName: 'asset',
			type: 'bookmark',
			props: {
				src: url,
				image: meta.image,
				title: meta.title,
				description: meta.description,
			},
			meta: {},
		}
	}
}
