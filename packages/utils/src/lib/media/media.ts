import { Image } from '../network'
import { isApngAnimated } from './apng'
import { isAvifAnimated } from './avif'
import { isGifAnimated } from './gif'
import { PngHelpers } from './png'
import { isWebpAnimated } from './webp'

/** @public */
export const DEFAULT_SUPPORTED_VECTOR_IMAGE_TYPES = Object.freeze(['image/svg+xml'])
/** @public */
export const DEFAULT_SUPPORTED_STATIC_IMAGE_TYPES = Object.freeze([
	'image/jpeg',
	'image/png',
	'image/webp',
])
/** @public */
export const DEFAULT_SUPPORTED_ANIMATED_IMAGE_TYPES = Object.freeze([
	'image/gif',
	'image/apng',
	'image/avif',
])
/** @public */
export const DEFAULT_SUPPORTED_IMAGE_TYPES = Object.freeze([
	...DEFAULT_SUPPORTED_STATIC_IMAGE_TYPES,
	...DEFAULT_SUPPORTED_VECTOR_IMAGE_TYPES,
	...DEFAULT_SUPPORTED_ANIMATED_IMAGE_TYPES,
])
/** @public */
export const DEFAULT_SUPPORT_VIDEO_TYPES = Object.freeze([
	'video/mp4',
	'video/webm',
	'video/quicktime',
])
/** @public */
export const DEFAULT_SUPPORTED_MEDIA_TYPE_LIST = [
	...DEFAULT_SUPPORTED_IMAGE_TYPES,
	...DEFAULT_SUPPORT_VIDEO_TYPES,
].join(',')

/**
 * Helpers for media
 *
 * @public
 */
export class MediaHelpers {
	/**
	 * Load a video from a url.
	 * @public
	 */
	static loadVideo(src: string): Promise<HTMLVideoElement> {
		return new Promise((resolve, reject) => {
			const video = document.createElement('video')
			video.onloadeddata = () => resolve(video)
			video.onerror = (e) => {
				console.error(e)
				reject(new Error('Could not load video'))
			}
			video.crossOrigin = 'anonymous'
			video.src = src
		})
	}

	/**
	 * Load an image from a url.
	 * @public
	 */
	static loadImage(src: string): Promise<HTMLImageElement> {
		return new Promise((resolve, reject) => {
			const img = Image()
			img.onload = () => resolve(img)
			img.onerror = (e) => {
				console.error(e)
				reject(new Error('Could not load image'))
			}
			img.crossOrigin = 'anonymous'
			img.referrerPolicy = 'strict-origin-when-cross-origin'
			img.src = src
		})
	}

	/**
	 * Get the size of a video blob
	 *
	 * @param src - A SharedBlob containing the video
	 * @public
	 */
	static async getVideoSize(blob: Blob): Promise<{ w: number; h: number }> {
		return MediaHelpers.usingObjectURL(blob, async (url) => {
			const video = await MediaHelpers.loadVideo(url)
			return { w: video.videoWidth, h: video.videoHeight }
		})
	}

	/**
	 * Get the size of an image blob
	 *
	 * @param dataURL - A Blob containing the image.
	 * @public
	 */
	static async getImageSize(blob: Blob): Promise<{ w: number; h: number }> {
		const image = await MediaHelpers.usingObjectURL(blob, MediaHelpers.loadImage)

		try {
			if (blob.type === 'image/png') {
				const view = new DataView(await blob.arrayBuffer())
				if (PngHelpers.isPng(view, 0)) {
					const physChunk = PngHelpers.findChunk(view, 'pHYs')
					if (physChunk) {
						const physData = PngHelpers.parsePhys(view, physChunk.dataOffset)
						if (physData.unit === 0 && physData.ppux === physData.ppuy) {
							const pixelRatio = Math.max(physData.ppux / 2834.5, 1)
							return {
								w: Math.round(image.naturalWidth / pixelRatio),
								h: Math.round(image.naturalHeight / pixelRatio),
							}
						}
					}
				}
			}
		} catch (err) {
			console.error(err)
			return { w: image.naturalWidth, h: image.naturalHeight }
		}
		return { w: image.naturalWidth, h: image.naturalHeight }
	}

	static async isAnimated(file: Blob): Promise<boolean> {
		if (file.type === 'image/gif') {
			return isGifAnimated(await file.arrayBuffer())
		}

		if (file.type === 'image/avif') {
			return isAvifAnimated(await file.arrayBuffer())
		}

		if (file.type === 'image/webp') {
			return isWebpAnimated(await file.arrayBuffer())
		}

		if (file.type === 'image/apng') {
			return isApngAnimated(await file.arrayBuffer())
		}

		return false
	}

	static isAnimatedImageType(mimeType: string | null): boolean {
		return DEFAULT_SUPPORTED_ANIMATED_IMAGE_TYPES.includes(mimeType || '')
	}

	static isStaticImageType(mimeType: string | null): boolean {
		return DEFAULT_SUPPORTED_STATIC_IMAGE_TYPES.includes(mimeType || '')
	}

	static isVectorImageType(mimeType: string | null): boolean {
		return DEFAULT_SUPPORTED_VECTOR_IMAGE_TYPES.includes(mimeType || '')
	}

	static isImageType(mimeType: string): boolean {
		return DEFAULT_SUPPORTED_IMAGE_TYPES.includes(mimeType)
	}

	static async usingObjectURL<T>(blob: Blob, fn: (url: string) => Promise<T>): Promise<T> {
		const url = URL.createObjectURL(blob)
		try {
			return await fn(url)
		} finally {
			URL.revokeObjectURL(url)
		}
	}
}
