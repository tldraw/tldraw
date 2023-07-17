import { png } from '@tldraw/editor'
import { isAnimated } from './is-gif-animated'

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
 * @param dataURL - The file as a string.
 * @internal
 *
 * from https://stackoverflow.com/a/53817185
 */
async function base64ToFile(dataURL: string) {
	return fetch(dataURL).then(function (result) {
		return result.arrayBuffer()
	})
}

/** @public */
export const ACCEPTED_IMG_TYPE = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml']
/** @public */
export const ACCEPTED_VID_TYPE = ['video/mp4', 'video/quicktime']

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
				if (png.isPng(view, 0)) {
					const physChunk = png.findChunk(view, 'pHYs')
					if (physChunk) {
						const physData = png.parsePhys(view, physChunk.dataOffset)
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
