import { MediaHelpers, assertExists } from '@tldraw/editor'
import {
	MAX_SAFE_CANVAS_LENGTH,
	getBrowserCanvasMaxSize,
} from '../../shapes/shared/getBrowserCanvasMaxSize'
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
 * Resize an image Blob to be smaller than it is currently.
 *
 * @example
 * ```ts
 * const image = await (await fetch('/image.jpg')).blob()
 * const size = await getImageSize(image)
 * const resizedImage = await resizeImage(image, size.w, size.h, { type: "image/jpeg", quality: 0.92 })
 * ```
 *
 * @param image - The image Blob.
 * @param width - The desired width.
 * @param height - The desired height.
 * @param opts - Options for the image.
 * @public
 */
export async function downsizeImage(
	blob: Blob,
	width: number,
	height: number,
	opts = {} as { type?: string; quality?: number }
): Promise<Blob> {
	const image = await MediaHelpers.usingObjectURL(blob, MediaHelpers.loadImage)
	let desiredWidth = Math.min(width * 2, image.naturalWidth)
	let desiredHeight = Math.min(height * 2, image.naturalHeight)
	const { type = 'image/jpeg', quality = 0.92 } = opts

	if (desiredWidth > MAX_SAFE_CANVAS_LENGTH || desiredHeight > MAX_SAFE_CANVAS_LENGTH) {
		const canvasSizes = await getBrowserCanvasMaxSize()

		const aspectRatio = width / height

		if (desiredWidth > canvasSizes.maxWidth) {
			desiredWidth = canvasSizes.maxWidth
			desiredHeight = desiredWidth / aspectRatio
		}

		if (desiredHeight > canvasSizes.maxHeight) {
			desiredHeight = canvasSizes.maxHeight
			desiredWidth = desiredHeight * aspectRatio
		}

		if (desiredWidth * desiredHeight > canvasSizes.maxArea) {
			const ratio = Math.sqrt(canvasSizes.maxArea / (desiredWidth * desiredHeight))
			desiredWidth *= ratio
			desiredHeight *= ratio
		}
	}

	const canvas = document.createElement('canvas')
	canvas.width = desiredWidth
	canvas.height = desiredHeight
	const ctx = assertExists(
		canvas.getContext('2d', { willReadFrequently: true }),
		'Could not get canvas context'
	)
	ctx.imageSmoothingEnabled = true
	ctx.imageSmoothingQuality = 'high'
	ctx.drawImage(image, 0, 0, desiredWidth, desiredHeight)

	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) {
					resolve(blob)
				} else {
					reject(new Error('Could not resize image'))
				}
			},
			type,
			quality
		)
	})
}

/** @public */
export const DEFAULT_ACCEPTED_IMG_TYPE = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml']
/** @public */
export const DEFAULT_ACCEPTED_VID_TYPE = ['video/mp4', 'video/quicktime']

/** @public */
export async function isGifAnimated(file: Blob): Promise<boolean> {
	return isAnimated(await file.arrayBuffer())
}
