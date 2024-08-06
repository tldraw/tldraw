import { AssetRecordType, TLAsset, fetch, getHashForString } from 'tldraw'
import { BOOKMARK_ENDPOINT } from './config'

interface ResponseBody {
	title?: string
	description?: string
	image?: string
	favicon?: string
}

export async function createAssetFromUrl({ url }: { type: 'url'; url: string }): Promise<TLAsset> {
	const urlHash = getHashForString(url)
	try {
		// First, try to get the meta data from our endpoint
		const fetchUrl =
			BOOKMARK_ENDPOINT +
			'?' +
			new URLSearchParams({
				url,
			}).toString()

		const meta = (await (await fetch(fetchUrl, { method: 'POST' })).json()) as ResponseBody | null

		return {
			id: AssetRecordType.createId(urlHash),
			typeName: 'asset',
			type: 'bookmark',
			props: {
				src: url,
				description: meta?.description ?? '',
				image: meta?.image ?? '',
				favicon: meta?.favicon ?? '',
				title: meta?.title ?? '',
			},
			meta: {},
		}
	} catch (error) {
		// Otherwise, fallback to a blank bookmark
		console.error(error)
		return {
			id: AssetRecordType.createId(urlHash),
			typeName: 'asset',
			type: 'bookmark',
			props: {
				src: url,
				description: '',
				image: '',
				favicon: '',
				title: '',
			},
			meta: {},
		}
	}
}
