import { AssetRecordType, Editor, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
// There's a guide at the bottom of this file!

const imageWidth = 1200
const imageHeight = 675

function handleMount(editor: Editor) {
	// [1]
	const assetId = AssetRecordType.createId()
	editor.createAssets([
		{
			id: assetId,
			type: 'image',
			typeName: 'asset',
			props: {
				name: 'tldraw.png',
				src: '/tldraw.png', // You could also use a data URL here
				w: imageWidth,
				h: imageHeight,
				mimeType: 'image/png',
				isAnimated: false,
			},
			meta: {},
		},
	])

	// [2]
	const { x, y } = editor.getViewportPageBounds().center
	editor.createShape({
		type: 'image',
		x: x - imageWidth / 2,
		y: y - imageHeight / 2,
		props: {
			assetId,
			w: imageWidth,
			h: imageHeight,
		},
	})
}

export default function LocalImagesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw onMount={handleMount} />
		</div>
	)
}

/*
An image shape doesn't hold its own pixels. It points at an asset record via `assetId`, and the asset
holds the source URL and the image's natural size. So to show an image you create the asset first [1]
and then the shape [2].

Here the image is served from this app's `public` folder. Your framework may serve static files
differently, or you might use a data URL. To let users upload their own images, see the hosted-images
example.

[1]
Create the asset record. `AssetRecordType.createId()` gives us an id we can reference from the shape.

[2]
Create the image shape, linked to the asset by `assetId`, and center it in the current viewport. The
shape starts at the image's natural size, but the user can resize it later without touching the asset.
That separation is one reason assets and shapes are different records: many shapes can share one asset.
*/
