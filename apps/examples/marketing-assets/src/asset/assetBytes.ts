import { uniqueId } from 'tldraw'

/**
 * The asset-bytes seam: every conversion between image bytes, data URLs, and the
 * worker's R2 object storage lives here.
 *
 * ADR-0006 keeps large images out of the synced room — backgrounds live in R2 and
 * only their URL rides the document. That bargain has one ongoing cost: bytes have
 * to cross between three forms (a `File`/`Blob` off the canvas, a data URL the image
 * model speaks, and an R2 URL on the record), and a re-render that edits a stored
 * background must read it back. Concentrating those conversions here means the upload
 * endpoint, naming, and read-back strategy change in one place.
 */

/** Read a `Blob` (or `File`) as a data URL. */
export function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(reader.result as string)
		reader.onerror = () => reject(reader.error)
		reader.readAsDataURL(blob)
	})
}

/** Fetch a stored asset URL and read it back as a data URL for the image model. */
export async function urlToDataUrl(url: string): Promise<string> {
	const blob = await (await fetch(url)).blob()
	return blobToDataUrl(blob)
}

/**
 * Upload raw image bytes (a data URL produced by the image model) to R2 and return
 * the URL to store on the asset record. Used by the generation pipeline, which makes
 * assets programmatically rather than through the editor's drop-upload flow.
 */
export async function uploadImageBytes(dataUrl: string, name: string): Promise<string> {
	const blob = await (await fetch(dataUrl)).blob()
	const objectName = `${uniqueId()}-${name}`.replace(/[^a-zA-Z0-9.]/g, '-')
	const url = `/api/uploads/${objectName}`

	const response = await fetch(url, {
		method: 'POST',
		body: blob,
		headers: { 'content-type': blob.type || 'image/png' },
	})
	if (!response.ok) {
		throw new Error(`Failed to upload image: ${response.statusText}`)
	}

	return url
}
