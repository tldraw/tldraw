import { useCallback } from 'react'
import { AssetRecordType, Editor, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function LocalVideosExample() {
	const handleMount = useCallback((editor: Editor) => {
		const assetId = AssetRecordType.createId()
		const videoWidth = 640
		const videoHeight = 360

		editor.createAssets([
			{
				id: assetId,
				type: 'video',
				typeName: 'asset',
				props: {
					name: 'fluid.mp4',
					src: '/fluid.mp4',
					w: videoWidth,
					h: videoHeight,
					mimeType: 'video/mp4',
					isAnimated: true,
				},
				meta: {},
			},
		])

		editor.createShape({
			type: 'video',
			x: (window.innerWidth - videoWidth) / 2,
			y: (window.innerHeight - videoHeight) / 2,
			props: {
				assetId,
				w: videoWidth,
				h: videoHeight,
			},
		})
	}, [])

	return (
		<div className="tldraw__editor">
			<Tldraw onMount={handleMount} />
		</div>
	)
}
