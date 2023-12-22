import {
	AssetRecordType,
	Editor,
	MediaHelpers,
	TLAsset,
	TLAssetId,
	Tldraw,
	getHashForString,
	isGifAnimated,
	uniqueId,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useCallback } from 'react'

const UPLOAD_URL = '/SOME_ENDPOINT'

export default function AssetPropsExample() {
	const handleMount = useCallback((editor: Editor) => {
		// When a user uploads a file, create an asset from it
		editor.registerExternalAssetHandler('file', async ({ file }: { type: 'file'; file: File }) => {
			const id = uniqueId()

			const objectName = `${id}-${file.name}`.replaceAll(/[^a-zA-Z0-9.]/g, '-')
			const url = `${UPLOAD_URL}/${objectName}`

			await fetch(url, {
				method: 'POST',
				body: file,
			})

			const assetId: TLAssetId = AssetRecordType.createId(getHashForString(url))

			let size: {
				w: number
				h: number
			}
			let isAnimated: boolean
			let shapeType: 'image' | 'video'

			if (['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'].includes(file.type)) {
				shapeType = 'image'
				size = await MediaHelpers.getImageSizeFromSrc(url)
				isAnimated = file.type === 'image/gif' && (await isGifAnimated(file))
			} else {
				shapeType = 'video'
				isAnimated = true
				size = await MediaHelpers.getVideoSizeFromSrc(url)
			}

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
