import {
	AssetRecordType,
	MediaHelpers,
	TLAsset,
	TLAssetId,
	getHashForString,
	uniqueId,
} from 'tldraw'
import { ASSET_UPLOADER_URL } from './config'

export async function createAssetFromFile({ file }: { type: 'file'; file: File }) {
	const id = uniqueId()

	const UPLOAD_URL = `${ASSET_UPLOADER_URL}/uploads`
	const objectName = `${id}-${file.name}`.replaceAll(/[^a-zA-Z0-9.]/g, '-')
	const url = `${UPLOAD_URL}/${objectName}`

	await fetch(url, {
		method: 'POST',
		body: file,
	})

	const assetId: TLAssetId = AssetRecordType.createId(getHashForString(url))

	const isImageType = MediaHelpers.isImageType(file.type)

	let size: {
		w: number
		h: number
	}
	let isAnimated: boolean

	if (isImageType) {
		size = await MediaHelpers.getImageSize(file)
		if (MediaHelpers.isAnimatedImageType(file.type)) {
			isAnimated = true // await getIsGifAnimated(file) todo export me from editor
		} else {
			isAnimated = false
		}
	} else {
		isAnimated = true
		size = await MediaHelpers.getVideoSize(file)
	}

	const asset: TLAsset = AssetRecordType.create({
		id: assetId,
		type: isImageType ? 'image' : 'video',
		typeName: 'asset',
		props: {
			name: file.name,
			src: url,
			w: size.w,
			h: size.h,
			mimeType: file.type,
			isAnimated,
		},
		meta: {},
	})

	return asset
}
