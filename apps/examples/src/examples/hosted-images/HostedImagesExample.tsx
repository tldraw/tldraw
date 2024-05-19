import { useCallback } from 'react'
import {
	AssetRecordType,
	Editor,
	MediaHelpers,
	TLAsset,
	TLAssetId,
	Tldraw,
	getHashForString,
	uniqueId,
} from 'tldraw'
import 'tldraw/tldraw.css'

// [1]
const UPLOAD_URL = '/SOME_ENDPOINT'

// [2]
export default function HostedImagesExample() {
	const handleMount = useCallback((editor: Editor) => {
		//[a]
		editor.registerExternalAssetHandler('file', async ({ file }: { type: 'file'; file: File }) => {
			const id = uniqueId()

			const objectName = `${id}-${file.name}`.replaceAll(/[^a-zA-Z0-9.]/g, '-')
			const url = `${UPLOAD_URL}/${objectName}`

			await fetch(url, {
				method: 'POST',
				body: file,
			})
			//[b]
			const assetId: TLAssetId = AssetRecordType.createId(getHashForString(url))

			let size: {
				w: number
				h: number
			}
			let isAnimated: boolean
			let shapeType: 'image' | 'video'

			//[c]
			if (MediaHelpers.isImageType(file.type)) {
				shapeType = 'image'
				size = await MediaHelpers.getImageSize(file)
				isAnimated = await MediaHelpers.isAnimated(file)
			} else {
				shapeType = 'video'
				isAnimated = true
				size = await MediaHelpers.getVideoSize(file)
			}
			//[d]
			const asset: TLAsset = AssetRecordType.create({
				id: assetId,
				type: shapeType,
				typeName: 'asset',
				props: {
					name: file.name,
					src: url,
					w: size.w,
					h: size.h,
					mimeType: file.type,
					isAnimated,
				},
			})

			return asset
		})
	}, [])

	return (
		<div className="tldraw__editor">
			<Tldraw onMount={handleMount} />
		</div>
	)
}
/* 
Introduction:
This example shows how to handle images uploaded by the user. to do this we'll
need to register an external asset handler, which is called when the user uploads
a file. We'll then upload the file to our server and create an asset from it.

[1]
You'll want to have an endpoint on your server that accepts a file and returns 
a url.

[2]
We use the onMount prop to get access to the editor instance and register our 
handler. Check out the API example for more details. 

	[a]
	We then register a handler for the 'file' type.
	You could also use this method to handle other types of external assets, 
	like embeds or pasted text, check out the external content sources example 
	for more. 

	[b]
	After uploading the file to our server, we create an asset for it. We'll 
	need to create a record for the asset, which is an object that contains 
	the asset's id, type, and props. We'll start by creating the id with the 
	AssetRecordType.createId method.

	[c]
	Now it's time to figure out the dimensions of the media is using our 
	MediaHelpers, and whether it's a gif, image or video.

	[d]
	Finally we create the asset record using the AssetRecordType.create method
	and return it. Note that we don't create a shape on the canvas here, if you
	want to see an example that does this, check out the local images example.


*/
