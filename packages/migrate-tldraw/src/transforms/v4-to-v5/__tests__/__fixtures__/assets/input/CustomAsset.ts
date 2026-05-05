import { getAssetInfo, notifyIfFileNotAllowed, getMediaAssetInfoPartial, assetValidator } from 'tldraw'

export async function uploadFile(editor: unknown, file: File) {
	notifyIfFileNotAllowed(file, { types: ['image'] })
	const info = await getAssetInfo(file, {}, 'asset:1')
	const partial = await getMediaAssetInfoPartial(file)
	return { info, partial, validator: assetValidator }
}
