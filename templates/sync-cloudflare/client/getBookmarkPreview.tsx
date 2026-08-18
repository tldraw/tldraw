import { AssetRecordType, TLAsset, TLBookmarkAsset, getHashForString } from 'tldraw'

// Bookmark unfurling: ask the worker for the URL's metadata and fill in an asset record.
export async function getBookmarkPreview({ url }: { url: string }): Promise<TLAsset> {
	const asset: TLBookmarkAsset = {
		id: AssetRecordType.createId(getHashForString(url)),
		typeName: 'asset',
		type: 'bookmark',
		meta: {},
		props: {
			src: url,
			description: '',
			image: '',
			favicon: '',
			title: '',
		},
	}

	try {
		const response = await fetch(`/api/unfurl?url=${encodeURIComponent(url)}`)
		const data: any = await response.json()

		asset.props.description = data?.description ?? ''
		asset.props.image = data?.image ?? ''
		asset.props.favicon = data?.favicon ?? ''
		asset.props.title = data?.title ?? ''

		// carry the social image's dimensions on `meta` so embeds (e.g. Vimeo/YouTube) can size
		// themselves to the content's real aspect ratio instead of staying letterboxed
		if (typeof data?.imageWidth === 'number') asset.meta.imageWidth = data.imageWidth
		if (typeof data?.imageHeight === 'number') asset.meta.imageHeight = data.imageHeight
	} catch (e) {
		console.error(e)
	}

	return asset
}
