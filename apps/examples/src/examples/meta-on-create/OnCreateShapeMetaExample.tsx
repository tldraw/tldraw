import { TLShape, Tldraw, track, useEditor } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

export default function OnCreateShapeMetaExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="tldraw_example"
				onMount={(editor) => {
					// There's no API for setting getInitialMetaForShape yet, but
					// you can replace it at runtime like this. This will run for
					// all shapes created by the user.
					editor.getInitialMetaForShape = (_shape) => {
						return {
							createdBy: editor.user.getId(),
							createdAt: Date.now(),
						}
					}
				}}
			>
				<MetaUiHelper />
			</Tldraw>
		</div>
	)
}

type ShapeWithMyMeta = TLShape & { meta: { updatedBy: string; updatedAt: string } }

export const MetaUiHelper = track(function MetaUiHelper() {
	const editor = useEditor()
	const onlySelectedShape = editor.getOnlySelectedShape() as ShapeWithMyMeta | null

	return (
		<pre style={{ position: 'absolute', zIndex: 300, top: 64, left: 12, margin: 0 }}>
			{onlySelectedShape
				? JSON.stringify(onlySelectedShape.meta, null, 2)
				: 'Select one shape to see its meta data.'}
		</pre>
	)
})
