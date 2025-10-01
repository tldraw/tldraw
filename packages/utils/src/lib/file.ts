import { fetch } from './network'

/**
 * Utility class providing helper methods for file and blob operations.
 *
 * FileHelpers contains static methods for common file operations including
 * URL fetching, format conversion, and MIME type manipulation. All methods work with
 * web APIs like fetch, FileReader, and Blob/File objects.
 *
 * @example
 * ```ts
 * // Fetch and convert a remote image to data URL
 * const dataUrl = await FileHelpers.urlToDataUrl('https://example.com/image.png')
 *
 * // Convert user-selected file to text
 * const text = await FileHelpers.blobToText(userFile)
 *
 * // Change file MIME type
 * const newFile = FileHelpers.rewriteMimeType(originalFile, 'application/json')
 * ```
 *
 * @public
 */
export class FileHelpers {
	/**
	 * Converts a URL to an ArrayBuffer by fetching the resource.
	 *
	 * Fetches the resource at the given URL and returns its content as an ArrayBuffer.
	 * This is useful for loading binary data like images, videos, or other file types.
	 *
	 * @param url - The URL of the file to fetch
	 * @returns Promise that resolves to the file content as an ArrayBuffer
	 * @example
	 * ```ts
	 * const buffer = await FileHelpers.urlToArrayBuffer('https://example.com/image.png')
	 * console.log(buffer.byteLength) // Size of the file in bytes
	 * ```
	 * @public
	 */
	static async urlToArrayBuffer(url: string) {
		const response = await fetch(url)
		return await response.arrayBuffer()
	}

	/**
	 * Converts a URL to a Blob by fetching the resource.
	 *
	 * Fetches the resource at the given URL and returns its content as a Blob object.
	 * Blobs are useful for handling file data in web applications.
	 *
	 * @param url - The URL of the file to fetch
	 * @returns Promise that resolves to the file content as a Blob
	 * @example
	 * ```ts
	 * const blob = await FileHelpers.urlToBlob('https://example.com/document.pdf')
	 * console.log(blob.type) // 'application/pdf'
	 * console.log(blob.size) // Size in bytes
	 * ```
	 * @public
	 */
	static async urlToBlob(url: string) {
		const response = await fetch(url)
		return await response.blob()
	}

	/**
	 * Converts a URL to a data URL by fetching the resource.
	 *
	 * Fetches the resource at the given URL and converts it to a base64-encoded data URL.
	 * If the URL is already a data URL, it returns the URL unchanged. This is useful for embedding
	 * resources directly in HTML or CSS.
	 *
	 * @param url - The URL of the file to convert, or an existing data URL
	 * @returns Promise that resolves to a data URL string
	 * @example
	 * ```ts
	 * const dataUrl = await FileHelpers.urlToDataUrl('https://example.com/image.jpg')
	 * // Returns: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA...'
	 *
	 * const existing = await FileHelpers.urlToDataUrl('data:text/plain;base64,SGVsbG8=')
	 * // Returns the same data URL unchanged
	 * ```
	 * @public
	 */
	static async urlToDataUrl(url: string) {
		if (url.startsWith('data:')) return url
		const blob = await FileHelpers.urlToBlob(url)
		return await FileHelpers.blobToDataUrl(blob)
	}

	/**
	 * Convert a Blob to a base64 encoded data URL.
	 *
	 * Converts a Blob object to a base64-encoded data URL using the FileReader API.
	 * This is useful for displaying images or embedding file content directly in HTML.
	 *
	 * @param file - The Blob object to convert
	 * @returns Promise that resolves to a base64-encoded data URL string
	 * @example
	 * ```ts
	 * const blob = new Blob(['Hello World'], { type: 'text/plain' })
	 * const dataUrl = await FileHelpers.blobToDataUrl(blob)
	 * // Returns: 'data:text/plain;base64,SGVsbG8gV29ybGQ='
	 *
	 * // With an image file
	 * const imageDataUrl = await FileHelpers.blobToDataUrl(myImageFile)
	 * // Can be used directly in img src attribute
	 * ```
	 * @public
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
	 * Convert a Blob to a unicode text string.
	 *
	 * Reads the content of a Blob object as a UTF-8 text string using the FileReader API.
	 * This is useful for reading text files or extracting text content from blobs.
	 *
	 * @param file - The Blob object to convert to text
	 * @returns Promise that resolves to the text content as a string
	 * @example
	 * ```ts
	 * const textBlob = new Blob(['Hello World'], { type: 'text/plain' })
	 * const text = await FileHelpers.blobToText(textBlob)
	 * console.log(text) // 'Hello World'
	 *
	 * // With a text file from user input
	 * const content = await FileHelpers.blobToText(myTextFile)
	 * console.log(content) // File content as string
	 * ```
	 * @public
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

	/**
	 * Creates a new Blob or File with a different MIME type.
	 *
	 * Creates a copy of the given Blob or File with a new MIME type while preserving
	 * all other properties. If the current MIME type already matches the new one, returns the
	 * original object unchanged. For File objects, preserves the filename.
	 *
	 * @param blob - The Blob or File object to modify
	 * @param newMimeType - The new MIME type to assign
	 * @returns A new Blob or File with the updated MIME type
	 * @example
	 * ```ts
	 * // Change a generic blob to a specific image type
	 * const blob = new Blob([imageData])
	 * const imageBlob = FileHelpers.rewriteMimeType(blob, 'image/png')
	 *
	 * // Change a file's MIME type while preserving filename
	 * const file = new File([data], 'document.txt', { type: 'text/plain' })
	 * const jsonFile = FileHelpers.rewriteMimeType(file, 'application/json')
	 * console.log(jsonFile.name) // 'document.txt' (preserved)
	 * console.log(jsonFile.type) // 'application/json' (updated)
	 * ```
	 * @public
	 */
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
