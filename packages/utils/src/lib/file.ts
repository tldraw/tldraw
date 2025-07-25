import { fetch } from './network'

/**
 * Helpers for files
 *
 * @public
 */
export class FileHelpers {
	/**
	 * @deprecated Use `urlToArrayBuffer` instead.
	 */
	static async dataUrlToArrayBuffer(dataURL: string) {
		return fetch(dataURL).then(function (result) {
			return result.arrayBuffer()
		})
	}

	/**
	 * @param url - The url of the file.
	 */
	static async urlToArrayBuffer(url: string) {
		const response = await fetch(url)
		return await response.arrayBuffer()
	}

	static async urlToBlob(url: string) {
		const response = await fetch(url)
		return await response.blob()
	}

	static async urlToDataUrl(url: string) {
		if (url.startsWith('data:')) return url
		const blob = await FileHelpers.urlToBlob(url)
		return await FileHelpers.blobToDataUrl(blob)
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
	 * @param file - The file as a blob.
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
	 * @param file - The file as a blob.
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

	static rewriteMimeType(blob: Blob, newMimeType: string): Blob
	static rewriteMimeType(blob: File, newMimeType: string): File
	static rewriteMimeType(blob: Blob | File, newMimeType: string): Blob | File {
		if (blob.type === newMimeType) return blob
		if (blob instanceof File) {
			return new File([blob], blob.name, { type: newMimeType })
		}
		return new Blob([blob], { type: newMimeType })
	}
}
