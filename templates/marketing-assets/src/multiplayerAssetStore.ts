import { TLAssetStore, uniqueId } from 'tldraw'

/**
 * How the app stores and serves assets in multiplayer. Generated backgrounds and
 * any media the user drops on the canvas are uploaded to the worker's R2 bucket;
 * only the resulting URL is stored on the asset record and synced through the
 * room. This keeps large images out of the synced document.
 */
export const multiplayerAssetStore: TLAssetStore = {
	async upload(_asset, file) {
		const id = uniqueId()
		const objectName = `${id}-${file.name}`.replace(/[^a-zA-Z0-9.]/g, '-')
		const url = `/api/uploads/${objectName}`

		const response = await fetch(url, { method: 'POST', body: file })
		if (!response.ok) {
			throw new Error(`Failed to upload asset: ${response.statusText}`)
		}

		return { src: url }
	},

	resolve(asset) {
		return asset.props.src
	},
}

/**
 * Upload raw image bytes (a data URL produced by the image model) to R2 and
 * return the URL to store on the asset record. Used by the generation pipeline,
 * which creates assets programmatically rather than via the editor's upload flow.
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

/** Fetch a stored asset URL and read it back as a data URL for the image model. */
export async function urlToDataUrl(url: string): Promise<string> {
	const blob = await (await fetch(url)).blob()
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(reader.result as string)
		reader.onerror = () => reject(reader.error)
		reader.readAsDataURL(blob)
	})
}
