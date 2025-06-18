import { AssetRecordType, TLAsset, TLUrlExternalContent, fetch, getHashForString } from 'tldraw'
import { rpc } from './rpc'

export async function onCreateAssetFromUrl({ url }: TLUrlExternalContent): Promise<TLAsset> {
	try {
		// First, try to get the data from the extension manager process, using node's fetch
		const meta = await rpc('vscode:bookmark', { url })

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
	} catch {
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
