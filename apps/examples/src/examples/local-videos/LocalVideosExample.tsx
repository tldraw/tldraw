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
					name: 'bonk.webm',
					src: '/bonk.webm',
					w: videoWidth,
					h: videoHeight,
					mimeType: 'video/webm',
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
