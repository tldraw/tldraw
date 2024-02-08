import { PngHelpers } from './png'

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
			const img = new Image()
			img.onload = () => resolve(img)
			img.onerror = (e) => {
				console.error(e)
				reject(new Error('Could not load image'))
			}
			img.crossOrigin = 'anonymous'
			img.src = src
		})
	}

	/**
	 * Read a blob into a data url
	 * @public
	 */
	static blobToDataUrl(blob: Blob): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onload = () => resolve(reader.result as string)
			reader.onerror = (e) => {
				console.error(e)
				reject(new Error('Could not read blob'))
			}
			reader.readAsDataURL(blob)
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

	static async usingObjectURL<T>(blob: Blob, fn: (url: string) => Promise<T>): Promise<T> {
		const url = URL.createObjectURL(blob)
		try {
			return await fn(url)
		} finally {
			URL.revokeObjectURL(url)
		}
	}
}
