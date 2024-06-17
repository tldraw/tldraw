import { fetch } from './network'

/**
 * Helpers for files
 *
 * @public
 */
export class FileHelpers {
	/**
	 * @param dataURL - The file as a string.
	 *
	 * from https://stackoverflow.com/a/53817185
	 */
	static async dataUrlToArrayBuffer(dataURL: string) {
		return fetch(dataURL).then(function (result) {
			return result.arrayBuffer()
		})
	}

	/**
	 * Convert a file to a base64 encoded data url.
	 *
	 * @example
	 *
	 * ```ts
	 * const A = FileHelpers.toDataUrl(myImageFile)
	 * ```
	 *
	 * @param value - The file as a blob.
	 */
	static async blobToDataUrl(file: Blob): Promise<string> {
		return await new Promise((resolve, reject) => {
			if (file) {
				const reader = new FileReader()
				reader.onload = () => resolve(reader.result as string)
				reader.onerror = (error) => reject(error)
				reader.onabort = (error) => reject(error)
				reader.readAsDataURL(file)
			}
		})
	}

	/**
	 * Convert a file to a unicode text string.
	 *
	 * @example
	 *
	 * ```ts
	 * const A = FileHelpers.fileToDataUrl(myTextFile)
	 * ```
	 *
	 * @param value - The file as a blob.
	 */
	static async blobToText(file: Blob): Promise<string> {
		return await new Promise((resolve, reject) => {
			if (file) {
				const reader = new FileReader()
				reader.onload = () => resolve(reader.result as string)
				reader.onerror = (error) => reject(error)
				reader.onabort = (error) => reject(error)
				reader.readAsText(file)
			}
		})
	}
}
