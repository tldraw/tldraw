import { AssetRecordType, Editor, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useCallback } from 'react'

// This is an example of how you can add an image to the editor. The image is already
// present in the `public` folder, so we can just use it directly.
// If you want to allow users to upload the images please take a look at the `HostedImagesExample.tsx`
export default function LocalImagesExample() {
	const handleMount = useCallback((editor: Editor) => {
		// Assets are records that store data about shared assets like images, videos, etc.
		// Each image has an associated asset record, so we'll create that first.

		// We need an `assetId` so that we can later associate it with the image.
		const assetId = AssetRecordType.createId()
		const imageWidth = 1200
		const imageHeight = 675

		editor.createAssets([
			{
				id: assetId,
				type: 'image',
				typeName: 'asset',
				props: {
					name: 'tldraw.png',
					src: '/tldraw.png', // You could also use a base64 encoded string here
					w: imageWidth,
					h: imageHeight,
					mimeType: 'image/png',
					isAnimated: false,
				},
				meta: {},
			},
		])
		editor.createShape({
			type: 'image',
			// Let's center the image in the editor
			x: (window.innerWidth - imageWidth) / 2,
			y: (window.innerHeight - imageHeight) / 2,
			props: {
				assetId,
				// We are using the full image size here, but as the user resizes the image
				// these values will get updated.
				// This shows why it's important to have a separate assets entity. Resizing an image
				// does not change the dimensions of the file itself, it just updates the dimensions
				// of the displayed image.
				w: imageWidth,
				h: imageHeight,
			},
		})
	}, [])

	return (
		<div className="tldraw__editor">
			<Tldraw
				// persistenceKey="tldraw_local_images_example"
				onMount={handleMount}
			/>
		</div>
	)
}
