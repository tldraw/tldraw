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

Introduction: This example shows how to handle images uploaded by the user. to do this we'll need to
create a TLAssetStore, which tells the editor how to handle uploaded assets. 

[1] You'll want to have an endpoint on your server that accepts file uploads, and returns URLs.

[2] We define our asset store, which has two methods: upload for saving assets, and resolve for
retrieving them.

    [a] The upload method is called when the user creates a file. It should take a `File` object,
    and return a URL that can be used to reference the file in the future.

    [b] After the file has been uploaded, whenever we want to refer to it again the editor will
    call the `resolve` method with the asset. Here, we just do the default and return the `src`
    prop. If you wanted to, you could return a different URL - for example, to serve optimized
    images, or to add an authentication token. The implementation here is the default, and could 
	have been omitted.

[3] Finally, we have our actual instance. We pass our asset store to the `assets` prop of the
`Tldraw` component so it becomes part of the store.

*/
