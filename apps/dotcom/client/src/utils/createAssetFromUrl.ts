import { AssetRecordType, TLAsset, fetch, getHashForString } from 'tldraw'
import { BOOKMARK_ENDPOINT } from './config'

interface ResponseBody {
	title?: string
	description?: string
	image?: string
	favicon?: string
	imageWidth?: number
	imageHeight?: number
}

// Pass the OpenGraph image dimensions through on the asset's meta so consumers (e.g. embeds) can
// size content by its real aspect ratio. Kept off `props` to avoid a bookmark asset schema change.
function getImageDimensionsMeta(meta: ResponseBody | null): {
	imageWidth?: number
	imageHeight?: number
} {
	const result: { imageWidth?: number; imageHeight?: number } = {}
	if (typeof meta?.imageWidth === 'number') result.imageWidth = meta.imageWidth
	if (typeof meta?.imageHeight === 'number') result.imageHeight = meta.imageHeight
	return result
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
			meta: getImageDimensionsMeta(meta),
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
