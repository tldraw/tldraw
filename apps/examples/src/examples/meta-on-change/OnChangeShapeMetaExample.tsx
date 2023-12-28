import { TLShape, Tldraw, track, useEditor } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

export default function OnChangeShapeMetaExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="tldraw_change_meta_example"
				onMount={(editor) => {
					// See the "meta-on-create" example for more about setting the
					// initial meta for a shape.
					editor.getInitialMetaForShape = (_shape) => {
						return {
							updatedBy: editor.user.getId(),
							updatedAt: Date.now(),
						}
					}
					// We can also use the sideEffects API to modify a shape before
					// its change is committed to the database. This will run for
					// all shapes whenever they are updated.
					editor.sideEffects.registerBeforeChangeHandler('shape', (_prev, next, source) => {
						if (source !== 'user') return next
						return {
							...next,
							meta: {
								updatedBy: editor.user.getId(),
								updatedAt: Date.now(),
							},
						}
					})
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
