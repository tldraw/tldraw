import { TLAssetStore, Tldraw, uniqueId } from 'tldraw'
import 'tldraw/tldraw.css'

// [1]
const UPLOAD_URL = '/SOME_ENDPOINT'

// [2]
const myAssetStore: TLAssetStore = {
	// [a]
	async upload(asset, file) {
		const id = uniqueId()

		const objectName = `${id}-${file.name}`.replaceAll(/\W/g, '-')
		const url = `${UPLOAD_URL}/${objectName}`

		await fetch(url, {
			method: 'POST',
			body: file,
		})

		return { src: url }
	},

	// [b]
	resolve(asset) {
		return asset.props.src
	},
}

// [3]
export default function HostedImagesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw assets={myAssetStore} />
		</div>
	)
}
/*
By default, images and videos added to the editor are stored as data URLs inside the
document, which is fine for a demo but bloats the document quickly. A `TLAssetStore`
tells the editor to upload files somewhere and store only a URL.

[1]
A placeholder for your server's upload endpoint. This example doesn't actually have one,
so uploads here will fail; the point is the shape of the code.

[2]
The asset store.

    [a] `upload` is called once when a file is added. It receives the asset record and the
    `File`, and must return the URL (`src`) that will be saved in the asset's props.

    [b] `resolve` is called whenever the editor needs to display the asset. Returning
    `asset.props.src` is the default behavior, so this method could be omitted. Implement
    it to rewrite the URL, for example to add an auth token or pick a resized variant
    based on the `ctx` argument (screen scale, whether it's for export, etc).

[3]
Pass the store to the `assets` prop. From then on, drops, pastes, and the "Upload media"
menu item all go through it.
*/
