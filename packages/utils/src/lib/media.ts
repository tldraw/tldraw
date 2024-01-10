import { FileHelpers } from './file'
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
	 * Get the size of a video from its source.
	 *
	 * @param src - A SharedBlob containing the video
	 * @public
	 */
	static async getVideoSize(blob: SharedBlob): Promise<{ w: number; h: number }> {
		try {
			const video = await MediaHelpers.loadVideo(blob.getUrl())
			return { w: video.videoWidth, h: video.videoHeight }
		} finally {
			blob.revokeUrl()
		}
	}

	/**
	 * Get the size of an image from its source.
	 *
	 * @param dataURL - A SharedBlob containing the image.
	 * @public
	 */
	static async getImageSize(blob: SharedBlob): Promise<{ w: number; h: number }> {
		try {
			const image = await MediaHelpers.loadImage(blob.getUrl())
			try {
			} catch (err) {
				console.error(err)
				return { w: image.naturalWidth, h: image.naturalHeight }
			}
		} finally {
			blob.revokeUrl()
		}

		return await new Promise((resolve, reject) => {
			const img = new Image()
			img.onload = async () => {
				try {
					const blob = await FileHelpers.base64ToFile(dataURL)
					const view = new DataView(blob)
					if (PngHelpers.isPng(view, 0)) {
						const physChunk = PngHelpers.findChunk(view, 'pHYs')
						if (physChunk) {
							const physData = PngHelpers.parsePhys(view, physChunk.dataOffset)
							if (physData.unit === 0 && physData.ppux === physData.ppuy) {
								const pixelRatio = Math.max(physData.ppux / 2834.5, 1)
								resolve({
									w: Math.round(img.width / pixelRatio),
									h: Math.round(img.height / pixelRatio),
								})
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
}

export class SharedBlob {
	constructor(readonly blob: Blob) {}

	urlRefCount = 0
	url: string | null = null

	getUrl() {
		if (!this.url) {
			this.url = URL.createObjectURL(this.blob)
		}

		this.urlRefCount++

		return this.url
	}

	revokeUrl() {
		// we give a grace period of 1 second before revoking the url for real
		setTimeout(() => {
			this.urlRefCount--

			if (this.urlRefCount <= 0) {
				URL.revokeObjectURL(this.url!)
				this.url = null
			}
		}, 1000)
	}
}
