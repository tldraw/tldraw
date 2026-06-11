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
