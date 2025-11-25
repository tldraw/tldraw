import { promiseWithResolve } from '../control'
import { Image } from '../network'
import { isApngAnimated } from './apng'
import { isAvifAnimated } from './avif'
import { isGifAnimated } from './gif'
import { PngHelpers } from './png'
import { isWebpAnimated } from './webp'

/**
 * Array of supported vector image MIME types.
 *
 * @example
 * ```ts
 * import { DEFAULT_SUPPORTED_VECTOR_IMAGE_TYPES } from '@tldraw/utils'
 *
 * const isSvg = DEFAULT_SUPPORTED_VECTOR_IMAGE_TYPES.includes('image/svg+xml')
 * console.log(isSvg) // true
 * ```
 * @public
 */
export const DEFAULT_SUPPORTED_VECTOR_IMAGE_TYPES = Object.freeze(['image/svg+xml' as const])
/**
 * Array of supported static (non-animated) image MIME types.
 *
 * @example
 * ```ts
 * import { DEFAULT_SUPPORTED_STATIC_IMAGE_TYPES } from '@tldraw/utils'
 *
 * const isStatic = DEFAULT_SUPPORTED_STATIC_IMAGE_TYPES.includes('image/jpeg')
 * console.log(isStatic) // true
 * ```
 * @public
 */
export const DEFAULT_SUPPORTED_STATIC_IMAGE_TYPES = Object.freeze([
	'image/jpeg' as const,
	'image/png' as const,
	'image/webp' as const,
])
/**
 * Array of supported animated image MIME types.
 *
 * @example
 * ```ts
 * import { DEFAULT_SUPPORTED_ANIMATED_IMAGE_TYPES } from '@tldraw/utils'
 *
 * const isAnimated = DEFAULT_SUPPORTED_ANIMATED_IMAGE_TYPES.includes('image/gif')
 * console.log(isAnimated) // true
 * ```
 * @public
 */
export const DEFAULT_SUPPORTED_ANIMATED_IMAGE_TYPES = Object.freeze([
	'image/gif' as const,
	'image/apng' as const,
	'image/avif' as const,
])
/**
 * Array of all supported image MIME types, combining static, vector, and animated types.
 *
 * @example
 * ```ts
 * import { DEFAULT_SUPPORTED_IMAGE_TYPES } from '@tldraw/utils'
 *
 * const isSupported = DEFAULT_SUPPORTED_IMAGE_TYPES.includes('image/png')
 * console.log(isSupported) // true
 * ```
 * @public
 */
export const DEFAULT_SUPPORTED_IMAGE_TYPES = Object.freeze([
	...DEFAULT_SUPPORTED_STATIC_IMAGE_TYPES,
	...DEFAULT_SUPPORTED_VECTOR_IMAGE_TYPES,
	...DEFAULT_SUPPORTED_ANIMATED_IMAGE_TYPES,
])
/**
 * Array of supported video MIME types.
 *
 * @example
 * ```ts
 * import { DEFAULT_SUPPORT_VIDEO_TYPES } from '@tldraw/utils'
 *
 * const isVideo = DEFAULT_SUPPORT_VIDEO_TYPES.includes('video/mp4')
 * console.log(isVideo) // true
 * ```
 * @public
 */
export const DEFAULT_SUPPORT_VIDEO_TYPES = Object.freeze([
	'video/mp4' as const,
	'video/webm' as const,
	'video/quicktime' as const,
])
/**
 * Array of all supported media MIME types, combining images and videos.
 *
 * @example
 * ```ts
 * import { DEFAULT_SUPPORTED_MEDIA_TYPES } from '@tldraw/utils'
 *
 * const isMediaFile = DEFAULT_SUPPORTED_MEDIA_TYPES.includes('video/mp4')
 * console.log(isMediaFile) // true
 * ```
 * @public
 */
export const DEFAULT_SUPPORTED_MEDIA_TYPES = Object.freeze([
	...DEFAULT_SUPPORTED_IMAGE_TYPES,
	...DEFAULT_SUPPORT_VIDEO_TYPES,
])
/**
 * Comma-separated string of all supported media MIME types, useful for HTML file input accept attributes.
 *
 * @example
 * ```ts
 * import { DEFAULT_SUPPORTED_MEDIA_TYPE_LIST } from '@tldraw/utils'
 *
 * // Use in HTML file input for media uploads
 * const input = document.createElement('input')
 * input.type = 'file'
 * input.accept = DEFAULT_SUPPORTED_MEDIA_TYPE_LIST
 * input.addEventListener('change', (e) => {
 *   const files = (e.target as HTMLInputElement).files
 *   if (files) console.log(`Selected ${files.length} file(s)`)
 * })
 * ```
 * @public
 */
export const DEFAULT_SUPPORTED_MEDIA_TYPE_LIST = DEFAULT_SUPPORTED_MEDIA_TYPES.join(',')

/**
 * Helpers for media
 *
 * @public
 */
export class MediaHelpers {
	/**
	 * Load a video element from a URL with cross-origin support.
	 *
	 * @param src - The URL of the video to load
	 * @returns Promise that resolves to the loaded HTMLVideoElement
	 * @example
	 * ```ts
	 * const video = await MediaHelpers.loadVideo('https://example.com/video.mp4')
	 * console.log(`Video dimensions: ${video.videoWidth}x${video.videoHeight}`)
	 * ```
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
	 * Extract a frame from a video element as a data URL.
	 *
	 * @param video - The HTMLVideoElement to extract frame from
	 * @param time - The time in seconds to extract the frame from (default: 0)
	 * @returns Promise that resolves to a data URL of the video frame
	 * @example
	 * ```ts
	 * const video = await MediaHelpers.loadVideo('https://example.com/video.mp4')
	 * const frameDataUrl = await MediaHelpers.getVideoFrameAsDataUrl(video, 5.0)
	 * // Use frameDataUrl as image thumbnail
	 * const img = document.createElement('img')
	 * img.src = frameDataUrl
	 * ```
	 * @public
	 */
	static async getVideoFrameAsDataUrl(video: HTMLVideoElement, time = 0): Promise<string> {
		const promise = promiseWithResolve<string>()
		let didSetTime = false

		const onReadyStateChanged = () => {
			if (!didSetTime) {
				if (video.readyState >= video.HAVE_METADATA) {
					didSetTime = true
					video.currentTime = time
				} else {
					return
				}
			}

			if (video.readyState >= video.HAVE_CURRENT_DATA) {
				const canvas = document.createElement('canvas')
				canvas.width = video.videoWidth
				canvas.height = video.videoHeight
				const ctx = canvas.getContext('2d')
				if (!ctx) {
					throw new Error('Could not get 2d context')
				}
				ctx.drawImage(video, 0, 0)
				promise.resolve(canvas.toDataURL())
			}
		}
		const onError = (e: Event) => {
			console.error(e)
			promise.reject(new Error('Could not get video frame'))
		}

		video.addEventListener('loadedmetadata', onReadyStateChanged)
		video.addEventListener('loadeddata', onReadyStateChanged)
		video.addEventListener('canplay', onReadyStateChanged)
		video.addEventListener('seeked', onReadyStateChanged)

		video.addEventListener('error', onError)
		video.addEventListener('stalled', onError)

		onReadyStateChanged()

		try {
			return await promise
		} finally {
			video.removeEventListener('loadedmetadata', onReadyStateChanged)
			video.removeEventListener('loadeddata', onReadyStateChanged)
			video.removeEventListener('canplay', onReadyStateChanged)
			video.removeEventListener('seeked', onReadyStateChanged)

			video.removeEventListener('error', onError)
			video.removeEventListener('stalled', onError)
		}
	}

	/**
	 * Load an image from a URL and get its dimensions along with the image element.
	 *
	 * @param src - The URL of the image to load
	 * @returns Promise that resolves to an object with width, height, and the image element
	 * @example
	 * ```ts
	 * const { w, h, image } = await MediaHelpers.getImageAndDimensions('https://example.com/image.png')
	 * console.log(`Image size: ${w}x${h}`)
	 * // Image is ready to use
	 * document.body.appendChild(image)
	 * ```
	 * @public
	 */
	static getImageAndDimensions(
		src: string
	): Promise<{ w: number; h: number; image: HTMLImageElement }> {
		return new Promise((resolve, reject) => {
			const img = Image()
			img.onload = () => {
				let dimensions
				if (img.naturalWidth) {
					dimensions = {
						w: img.naturalWidth,
						h: img.naturalHeight,
					}
				} else {
					// Sigh, Firefox doesn't have naturalWidth or naturalHeight for SVGs. :-/
					// We have to attach to dom and use clientWidth/clientHeight.
					document.body.appendChild(img)
					dimensions = {
						w: img.clientWidth,
						h: img.clientHeight,
					}
					document.body.removeChild(img)
				}
				resolve({ ...dimensions, image: img })
			}
			img.onerror = (e) => {
				console.error(e)
				reject(new Error('Could not load image'))
			}
			img.crossOrigin = 'anonymous'
			img.referrerPolicy = 'strict-origin-when-cross-origin'
			img.style.visibility = 'hidden'
			img.style.position = 'absolute'
			img.style.opacity = '0'
			img.style.zIndex = '-9999'
			img.src = src
		})
	}

	/**
	 * Get the size of a video blob
	 *
	 * @param blob - A Blob containing the video
	 * @returns Promise that resolves to an object with width and height properties
	 * @example
	 * ```ts
	 * const file = new File([...], 'video.mp4', { type: 'video/mp4' })
	 * const { w, h } = await MediaHelpers.getVideoSize(file)
	 * console.log(`Video dimensions: ${w}x${h}`)
	 * ```
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
	 * @param blob - A Blob containing the image
	 * @returns Promise that resolves to an object with width and height properties
	 * @example
	 * ```ts
	 * const file = new File([...], 'image.png', { type: 'image/png' })
	 * const { w, h } = await MediaHelpers.getImageSize(file)
	 * console.log(`Image dimensions: ${w}x${h}`)
	 * ```
	 * @public
	 */
	static async getImageSize(blob: Blob): Promise<{ w: number; h: number }> {
		const { w, h } = await MediaHelpers.usingObjectURL(blob, MediaHelpers.getImageAndDimensions)

		try {
			if (blob.type === 'image/png') {
				const view = new DataView(await blob.arrayBuffer())
				if (PngHelpers.isPng(view, 0)) {
					const physChunk = PngHelpers.findChunk(view, 'pHYs')
					if (physChunk) {
						const physData = PngHelpers.parsePhys(view, physChunk.dataOffset)
						if (physData.unit === 1 && physData.ppux === physData.ppuy) {
							// Calculate pixels per meter:
							// - 1 inch = 0.0254 meters
							// - 72 DPI is 72 dots per inch
							// - pixels per meter = 72 / 0.0254
							const pixelsPerMeter = 72 / 0.0254
							const pixelRatio = Math.max(physData.ppux / pixelsPerMeter, 1)
							return {
								w: Math.round(w / pixelRatio),
								h: Math.round(h / pixelRatio),
							}
						}
					}
				}
			}
		} catch (err) {
			console.error(err)
			return { w, h }
		}
		return { w, h }
	}

	/**
	 * Check if a media file blob contains animation data.
	 *
	 * @param file - The Blob to check for animation
	 * @returns Promise that resolves to true if the file is animated, false otherwise
	 * @example
	 * ```ts
	 * const file = new File([...], 'animation.gif', { type: 'image/gif' })
	 * const animated = await MediaHelpers.isAnimated(file)
	 * console.log(animated ? 'Animated' : 'Static')
	 * ```
	 * @public
	 */
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

	/**
	 * Check if a MIME type represents an animated image format.
	 *
	 * @param mimeType - The MIME type to check
	 * @returns True if the MIME type is an animated image format, false otherwise
	 * @example
	 * ```ts
	 * const isAnimated = MediaHelpers.isAnimatedImageType('image/gif')
	 * console.log(isAnimated) // true
	 * ```
	 * @public
	 */
	static isAnimatedImageType(mimeType: string | null): boolean {
		return DEFAULT_SUPPORTED_ANIMATED_IMAGE_TYPES.includes((mimeType as any) || '')
	}

	/**
	 * Check if a MIME type represents a static (non-animated) image format.
	 *
	 * @param mimeType - The MIME type to check
	 * @returns True if the MIME type is a static image format, false otherwise
	 * @example
	 * ```ts
	 * const isStatic = MediaHelpers.isStaticImageType('image/jpeg')
	 * console.log(isStatic) // true
	 * ```
	 * @public
	 */
	static isStaticImageType(mimeType: string | null): boolean {
		return DEFAULT_SUPPORTED_STATIC_IMAGE_TYPES.includes((mimeType as any) || '')
	}

	/**
	 * Check if a MIME type represents a vector image format.
	 *
	 * @param mimeType - The MIME type to check
	 * @returns True if the MIME type is a vector image format, false otherwise
	 * @example
	 * ```ts
	 * const isVector = MediaHelpers.isVectorImageType('image/svg+xml')
	 * console.log(isVector) // true
	 * ```
	 * @public
	 */
	static isVectorImageType(mimeType: string | null): boolean {
		return DEFAULT_SUPPORTED_VECTOR_IMAGE_TYPES.includes((mimeType as any) || '')
	}

	/**
	 * Check if a MIME type represents any supported image format (static, animated, or vector).
	 *
	 * @param mimeType - The MIME type to check
	 * @returns True if the MIME type is a supported image format, false otherwise
	 * @example
	 * ```ts
	 * const isImage = MediaHelpers.isImageType('image/png')
	 * console.log(isImage) // true
	 * ```
	 * @public
	 */
	static isImageType(mimeType: string): boolean {
		return DEFAULT_SUPPORTED_IMAGE_TYPES.includes((mimeType as any) || '')
	}

	/**
	 * Utility function to create an object URL from a blob, execute a function with it, and automatically clean it up.
	 *
	 * @param blob - The Blob to create an object URL for
	 * @param fn - Function to execute with the object URL
	 * @returns Promise that resolves to the result of the function
	 * @example
	 * ```ts
	 * const result = await MediaHelpers.usingObjectURL(imageBlob, async (url) => {
	 *   const { w, h } = await MediaHelpers.getImageAndDimensions(url)
	 *   return { width: w, height: h }
	 * })
	 * // Object URL is automatically revoked after function completes
	 * console.log(`Image dimensions: ${result.width}x${result.height}`)
	 * ```
	 * @public
	 */
	static async usingObjectURL<T>(blob: Blob, fn: (url: string) => Promise<T>): Promise<T> {
		const url = URL.createObjectURL(blob)
		try {
			return await fn(url)
		} finally {
			URL.revokeObjectURL(url)
		}
	}
}
