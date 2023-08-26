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

/** @public */
export const DEFAULT_ACCEPTED_IMG_TYPE = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml']
/** @public */
export const DEFAULT_ACCEPTED_VID_TYPE = ['video/mp4', 'video/quicktime']

/** @public */
export async function isGifAnimated(file: File): Promise<boolean> {
	return await new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onerror = () => reject(reader.error)
		reader.onload = () => {
			resolve(reader.result ? isAnimated(reader.result as ArrayBuffer) : false)
		}
		reader.readAsArrayBuffer(file)
	})
}
