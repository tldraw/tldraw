import {
	AssetRecordType,
	MediaHelpers,
	TLAssetId,
	createMediaAssetInfoSkeleton,
	fetch,
	getHashForString,
	uniqueId,
} from 'tldraw'
import { ASSET_UPLOADER_URL } from './config'

export async function createAssetFromFile({ file }: { type: 'file'; file: File }) {
	const UPLOAD_URL = `${ASSET_UPLOADER_URL}/uploads`
	const objectName = `${uniqueId()}-${file.name}`.replaceAll(/[^a-zA-Z0-9.]/g, '-')
	const url = `${UPLOAD_URL}/${objectName}`

	await fetch(url, {
		method: 'POST',
		body: file,
	})

	const isImageType = MediaHelpers.isImageType(file.type)
	const assetId: TLAssetId = AssetRecordType.createId(getHashForString(url))
	const assetInfo = await createMediaAssetInfoSkeleton(file, assetId, isImageType, !isImageType)
	assetInfo.props.src = url
	return AssetRecordType.create(assetInfo)
}
