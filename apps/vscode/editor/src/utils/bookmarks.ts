import { AssetRecordType, Editor, TLAsset, truncateStringWithEllipsis } from '@tldraw/editor'
import { getHashForString } from '@tldraw/utils'
import { rpc } from './rpc'

export async function onCreateAssetFromUrl(editor: Editor, url: string): Promise<TLAsset> {
	try {
		// First, try to get the data from vscode
		const meta = await rpc('vscode:bookmark', { url })

		return {
			id: AssetRecordType.createId(getHashForString(url)),
			typeName: 'asset',
			type: 'bookmark',
			props: {
				src: url,
				description: meta.description ?? '',
				image: meta.image ?? '',
				title: meta.title ?? truncateStringWithEllipsis(url, 54),
			},
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
					truncateStringWithEllipsis(url, 54),
				description:
					doc.head.querySelector('meta[property="og:description"]')?.getAttribute('content') ?? '',
			}
		} catch (error) {
			console.error(error)
			meta = { image: '', title: truncateStringWithEllipsis(url, 54), description: '' }
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
		}
	}
}
