import { FileHelpers } from './file'
import { PngHelpers } from './png'

/**
 * Helpers for media
 *
 * @public
 */
export class MediaHelpers {
	/**
	 * Get the size of a video from its source.
	 *
	 * @param src - The source of the video.
	 * @public
	 */
	static async getVideoSizeFromSrc(src: string): Promise<{ w: number; h: number }> {
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
	static async getImageSizeFromSrc(dataURL: string): Promise<{ w: number; h: number }> {
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
}
