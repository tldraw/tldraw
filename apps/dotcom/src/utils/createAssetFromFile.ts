import {
	AssetRecordType,
	DEFAULT_ACCEPTED_IMG_TYPE,
	MediaHelpers,
	TLAsset,
	TLAssetId,
	TLImageAsset,
	downsizeImage,
	getHashForString,
	uniqueId,
} from 'tldraw'
import { ASSET_UPLOADER_URL } from './config'

export async function createAssetFromFile({ file }: { type: 'file'; file: File }) {
	const id = uniqueId()

	const UPLOAD_URL = `${ASSET_UPLOADER_URL}/uploads`
	const objectName = `${id}-${file.name}`.replaceAll(/[^a-zA-Z0-9.]/g, '-')
	const url = `${UPLOAD_URL}/${objectName}`

	const assetId: TLAssetId = AssetRecordType.createId(getHashForString(url))

	const isImageType = DEFAULT_ACCEPTED_IMG_TYPE.includes(file.type)

	let size: {
		w: number
		h: number
	}
	let isAnimated: boolean

	let props
	if (isImageType) {
		size = await MediaHelpers.getImageSize(file)
		if (file.type === 'image/gif') {
			isAnimated = true // await getIsGifAnimated(file) todo export me from editor
		} else {
			isAnimated = false
		}

		const scaleOneImage = await downsizeImage(file, size.w, size.h, {
			type: file.type,
			quality: 0.92,
		})

		await fetch(url, {
			method: 'POST',
			body: scaleOneImage,
		})

		const sources: TLImageAsset['props']['sources'] = [
			{
				scale: 1,
				src: url,
			},
		]

		// Always rescale the image
		if (file.type === 'image/jpeg' || file.type === 'image/png') {
			const scaleHalfImage = await downsizeImage(file, size.w / 2, size.h / 2, {
				type: file.type,
				quality: 0.92,
			})
			const scaleHalfUrl = `${url}-scale0.5`
			await fetch(scaleHalfUrl, {
				method: 'POST',
				body: scaleHalfImage,
			})
			const scaleQuarterUrl = `${url}-scale0.25`
			const scaleQuarterImage = await downsizeImage(file, size.w / 4, size.h / 4, {
				type: file.type,
				quality: 0.92,
			})
			await fetch(scaleQuarterUrl, {
				method: 'POST',
				body: scaleQuarterImage,
			})

			sources.push(
				{
					scale: 1 / 2,
					src: scaleHalfUrl,
				},
				{
					scale: 1 / 4,
					src: scaleQuarterUrl,
				}
			)
		}

		props = {
			name: file.name,
			sources,
			w: size.w,
			h: size.h,
			mimeType: file.type,
			isAnimated,
		}
	} else {
		isAnimated = true
		size = await MediaHelpers.getVideoSize(file)
		props = {
			name: file.name,
			src: url,
			w: size.w,
			h: size.h,
			mimeType: file.type,
			isAnimated,
		}
	}

	const asset: TLAsset = AssetRecordType.create({
		id: assetId,
		type: isImageType ? 'image' : 'video',
		typeName: 'asset',
		props,
		meta: {},
	})

	return asset
}
