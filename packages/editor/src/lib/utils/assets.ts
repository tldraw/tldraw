import { AssetRecordType, TLAsset, TLAssetId } from '@tldraw/tlschema'
import { getHashForString } from '@tldraw/utils'
import uniq from 'lodash.uniq'
import { MAX_ASSET_HEIGHT, MAX_ASSET_WIDTH } from '../constants'
import { isAnimated } from './is-gif-animated'
import { findChunk, isPng, parsePhys } from './png'

/** @public */
export const ACCEPTED_IMG_TYPE = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml']
/** @public */
export const ACCEPTED_VID_TYPE = ['video/mp4', 'video/quicktime']
/** @public */
export const ACCEPTED_ASSET_TYPE = ACCEPTED_IMG_TYPE.concat(ACCEPTED_VID_TYPE).join(', ')

/** @public */
export const isImage = (ext: string) => ACCEPTED_IMG_TYPE.includes(ext)

/**
 * Get the size of a video from its source.
 *
 * @param src - The source of the video.
 * @public
 */
export async function getVideoSizeFromSrc(src: string): Promise<{ w: number; h: number }> {
	return await new Promise((resolve, reject) => {
		const video = document.createElement('video')
		video.onloadeddata = () => resolve({ w: video.videoWidth, h: video.videoHeight })
		video.onerror = (e) => {
			console.error(e)
			reject(new Error('Could not get video size'))
		}
		video.crossOrigin = 'anonymous'
		video.src = src
	})
}

/**
 * @param dataURL - The file as a string.
 * @internal
 *
 * from https://stackoverflow.com/a/53817185
 */
export async function base64ToFile(dataURL: string) {
	return fetch(dataURL).then(function (result) {
		return result.arrayBuffer()
	})
}

/**
 * Get the size of an image from its source.
 *
 * @param dataURL - The file as a string.
 * @public
 */
export async function getImageSizeFromSrc(dataURL: string): Promise<{ w: number; h: number }> {
	return await new Promise((resolve, reject) => {
		const img = new Image()
		img.onload = async () => {
			try {
				const blob = await base64ToFile(dataURL)
				const view = new DataView(blob)
				if (isPng(view, 0)) {
					const physChunk = findChunk(view, 'pHYs')
					if (physChunk) {
						const physData = parsePhys(view, physChunk.dataOffset)
						if (physData.unit === 0 && physData.ppux === physData.ppuy) {
							const pixelRatio = Math.round(physData.ppux / 2834.5)
							resolve({ w: img.width / pixelRatio, h: img.height / pixelRatio })
							return
						}
					}
				}

				resolve({ w: img.width, h: img.height })
			} catch (err) {
				console.error(err)
				resolve({ w: img.width, h: img.height })
			}
		}
		img.onerror = (err) => {
			console.error(err)
			reject(new Error('Could not get image size'))
		}
		img.crossOrigin = 'anonymous'
		img.src = dataURL
	})
}

/**
 * Get the size of an image from its source.
 *
 * @param dataURLForImage - The image file as a string.
 * @param width - The desired width.
 * @param height - The desired height.
 * @public
 */
export async function getResizedImageDataUrl(
	dataURLForImage: string,
	width: number,
	height: number
): Promise<string> {
	return await new Promise((resolve) => {
		const img = new Image()
		img.onload = () => {
			// Initialize the canvas and it's size
			const canvas = document.createElement('canvas')
			const ctx = canvas.getContext('2d')

			if (!ctx) return

			// Set width and height
			canvas.width = width * 2
			canvas.height = height * 2

			// Draw image and export to a data-uri
			ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
			const newDataURL = canvas.toDataURL()

			// Do something with the result, like overwrite original
			resolve(newDataURL)
		}
		img.crossOrigin = 'anonymous'
		img.src = dataURLForImage
	})
}

/**
 * Get an asset from a file.
 *
 * @param file - The file.
 * @returns An image or video asset partial.
 * @public
 */
export async function getMediaAssetFromFile(file: File): Promise<TLAsset> {
	return await new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onerror = () => reject(reader.error)
		reader.onload = async () => {
			let dataUrl = reader.result as string

			const isImageType = isImage(file.type)
			const sizeFn = isImageType ? getImageSizeFromSrc : getVideoSizeFromSrc

			// Hack to make .mov videos work via dataURL.
			if (file.type === 'video/quicktime' && dataUrl.includes('video/quicktime')) {
				dataUrl = dataUrl.replace('video/quicktime', 'video/mp4')
			}

			const originalSize = await sizeFn(dataUrl)
			const size = containBoxSize(originalSize, { w: MAX_ASSET_WIDTH, h: MAX_ASSET_HEIGHT })

			if (size !== originalSize && (file.type === 'image/jpeg' || file.type === 'image/png')) {
				// If we created a new size and the type is an image, rescale the image
				dataUrl = await getResizedImageDataUrl(dataUrl, size.w, size.h)
			}

			const assetId: TLAssetId = AssetRecordType.createId(getHashForString(dataUrl))

			const metadata = await getFileMetaData(file)

			const asset: TLAsset = {
				id: assetId,
				type: isImageType ? 'image' : 'video',
				typeName: 'asset',
				props: {
					name: file.name,
					src: dataUrl,
					w: size.w,
					h: size.h,
					mimeType: file.type,
					isAnimated: metadata.isAnimated,
				},
				meta: {},
			}

			resolve(asset)
		}

		reader.readAsDataURL(file)
	})
}

/**
 * Get some metadata about the file
 *
 * @param file - The file.
 * @public
 */
export async function getFileMetaData(file: File): Promise<{ isAnimated: boolean }> {
	if (file.type === 'image/gif') {
		return await new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onerror = () => reject(reader.error)
			reader.onload = () => {
				resolve({
					isAnimated: reader.result ? isAnimated(reader.result as ArrayBuffer) : false,
				})
			}
			reader.readAsArrayBuffer(file)
		})
	}

	return {
		isAnimated: isImage(file.type) ? false : true,
	}
}

type BoxWidthHeight = {
	w: number
	h: number
}

/**
 * Contains the size within the given box size
 *
 * @param originalSize - The size of the asset
 * @param containBoxSize - The container size
 * @returns Adjusted size
 * @public
 */
export function containBoxSize(
	originalSize: BoxWidthHeight,
	containBoxSize: BoxWidthHeight
): BoxWidthHeight {
	const overByXScale = originalSize.w / containBoxSize.w
	const overByYScale = originalSize.h / containBoxSize.h

	if (overByXScale <= 1 && overByYScale <= 1) {
		return originalSize
	} else if (overByXScale > overByYScale) {
		return {
			w: originalSize.w / overByXScale,
			h: originalSize.h / overByXScale,
		}
	} else {
		return {
			w: originalSize.w / overByYScale,
			h: originalSize.h / overByYScale,
		}
	}
}

/** @public */
export const isValidHttpURL = (url: string) => {
	try {
		const u = new URL(url)
		return u.protocol === 'http:' || u.protocol === 'https:'
	} catch (e) {
		return false
	}
}

/** @public */
export const getValidHttpURLList = (url: string) => {
	const urls = url.split(/[\n\s]/)
	for (const url of urls) {
		try {
			const u = new URL(url)
			if (!(u.protocol === 'http:' || u.protocol === 'https:')) {
				return
			}
		} catch (e) {
			return
		}
	}
	return uniq(urls)
}

/** @public */
export const isSvgText = (text: string) => {
	return /^<svg/.test(text)
}

/** @public */
export function dataUrlToFile(url: string, filename: string, mimeType: string) {
	return fetch(url)
		.then(function (res) {
			return res.arrayBuffer()
		})
		.then(function (buf) {
			return new File([buf], filename, { type: mimeType })
		})
}
