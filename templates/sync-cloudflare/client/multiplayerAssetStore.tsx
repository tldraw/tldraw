import { TLAssetStore, uniqueId } from 'tldraw'

// Assets like images and videos are POSTed to the worker, which stores them in the bucket.
export const multiplayerAssetStore: TLAssetStore = {
	async upload(_asset, file) {
		const objectName = `${uniqueId()}-${file.name}`.replace(/[^a-zA-Z0-9.]/g, '-')
		const url = `/api/uploads/${objectName}`

		const response = await fetch(url, {
			method: 'POST',
			body: file,
		})

		if (!response.ok) {
			throw new Error(`Failed to upload asset: ${response.statusText}`)
		}

		return { src: url }
	},

	// the same URL serves the asset. you could customize this to add extra auth, or to serve
	// optimized versions / sizes of the asset.
	resolve(asset) {
		return asset.props.src
	},
}
