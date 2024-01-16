import {
	AssetRecordType,
	DEFAULT_ACCEPTED_IMG_TYPE,
	MediaHelpers,
	TLAsset,
	TLAssetId,
	getHashForString,
	uniqueId,
} from '@tldraw/tldraw'
import { useCallback } from 'react'

export function useMultiplayerAssets(assetUploaderUrl: string) {
	return useCallback(
		async (file: File): Promise<TLAsset> => {
			const id = uniqueId()

			const UPLOAD_URL = `${assetUploaderUrl}/uploads`
			const objectName = `${id}-${file.name}`.replaceAll(/[^a-zA-Z0-9.]/g, '-')
			const url = `${UPLOAD_URL}/${objectName}`

			await fetch(url, {
				method: 'POST',
				body: file,
			})

			const assetId: TLAssetId = AssetRecordType.createId(getHashForString(url))

			const isImageType = DEFAULT_ACCEPTED_IMG_TYPE.includes(file.type)

			let size: {
				w: number
				h: number
			}
			let isAnimated: boolean

			if (isImageType) {
				size = await MediaHelpers.getImageSize(file)
				if (file.type === 'image/gif') {
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
		},
		[assetUploaderUrl]
	)
}
