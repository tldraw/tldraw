import { useCallback } from 'react'
import { AssetRecordType, Editor, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
// There's a guide at the bottom of this file!

export default function LocalImagesExample() {
	// [1]
	const handleMount = useCallback((editor: Editor) => {
		//[2]
		const assetId = AssetRecordType.createId()
		const imageWidth = 1200
		const imageHeight = 675
		//[2]
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
		//[3]
		editor.createShape({
			type: 'image',
			// Let's center the image in the editor
			x: (window.innerWidth - imageWidth) / 2,
			y: (window.innerHeight - imageHeight) / 2,
			props: {
				assetId,
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

/* 
This is an example of how you can add a locally hosted image to the editor.
We need to first create an asset that holds the source image [2], and then 
create the Image shape itself [3].

Because this is a Next.js app, we can use the `public` folder to store the 
image locally, your framework may have a different way of serving statis
assets. 

If you want to allow users to upload the images please take a look at the 
hosted images example.

[1] 
We'll access the editor instance via the `onMount` callback. Check out the API 
example for another way to do this.

[2]
Assets are records that store data about shared assets like images, videos, etc. 
Each image has an associated asset record, so we'll create that first. We need an 
`assetId` so that we can later associate it with the image.

[3]
We create the image sgape and pass in the `assetId` that we created earlier. This
will link our image shape to the asset record. Notice that we create the shape with
the same dimensions as the image, later on the user may resize the image, but we 
don't want to resize our asset, this is one of the reasons why it's important to 
keep assets and shapes separate.
*/
