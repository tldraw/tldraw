import { useCallback } from 'react'
import {
	AssetRecordType,
	DEFAULT_ACCEPTED_IMG_TYPE,
	MediaHelpers,
	TLAssetId,
	TLImageAsset,
	TLVideoAsset,
	getHashForString,
	uniqueId,
} from 'tldraw'

export function useMultiplayerVideoAsset(assetUploaderUrl: string) {
	return useCallback(
		async (file: File): Promise<TLVideoAsset> => {
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
			if (isImageType) throw Error('File is not a video')
			const isAnimated = true
			const size = await MediaHelpers.getVideoSize(file)

			const asset = AssetRecordType.create({
				id: assetId,
				type: 'video',
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
			} satisfies TLVideoAsset) as TLVideoAsset

			return asset
		},
		[assetUploaderUrl]
	)
}

export function useMultiplayerImageAsset(assetUploaderUrl: string) {
	return useCallback(
		async (files: File[]): Promise<TLImageAsset> => {
			const id = uniqueId()

			const UPLOAD_URL = `${assetUploaderUrl}/uploads`

			const urls: string[] = []

			let size: { w: number; h: number } | undefined
			let isAnimated = false
			let assetId: TLAssetId | undefined
			let name: string | undefined
			let mimeType: string | undefined

			// let's assume the scale will be 1, .5, .25, with the first being the largest

			for (let i = 0; i < files.length; i++) {
				const file = files[i]
				if (!DEFAULT_ACCEPTED_IMG_TYPE.includes(file.type)) throw Error('File is not an image')

				const objectName = `${id}-${file.name}-${i}`.replaceAll(/[^a-zA-Z0-9.]/g, '-')
				const url = `${UPLOAD_URL}/${objectName}`

				if (i === 0) {
					name = file.name
					assetId = AssetRecordType.createId(getHashForString(url))
					if (file.type === 'image/gif') isAnimated = true
					size = await MediaHelpers.getImageSize(file)
				}

				urls.push(url)
				await fetch(url, {
					method: 'POST',
					body: file,
				})
			}

			if (!assetId) throw Error('No asset id created')

			const asset = AssetRecordType.create({
				id: assetId,
				type: 'image',
				typeName: 'asset',
				props: {
					name: name!,
					w: size!.w,
					h: size!.h,
					mimeType: mimeType!,
					isAnimated,
					sources: urls.map((url, i) => ({ scale: 1 / (1 + i) ** 2, src: url })),
				},
				meta: {},
			} satisfies TLImageAsset) as TLImageAsset

			return asset
		},
		[assetUploaderUrl]
	)
}
