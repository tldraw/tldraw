import { TLShape, Tldraw, track, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

export default function OnChangeShapeMetaExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="tldraw_change_meta_example"
				onMount={(editor) => {
					// [1]
					editor.getInitialMetaForShape = (_shape) => {
						return {
							updatedBy: editor.user.getId(),
							updatedAt: Date.now(),
						}
					}
					// [2]
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

// [3]
type ShapeWithMyMeta = TLShape & { meta: { updatedBy: string; updatedAt: string } }

// [4]
export const MetaUiHelper = track(function MetaUiHelper() {
	const editor = useEditor()
	const onlySelectedShape = editor.getOnlySelectedShape() as ShapeWithMyMeta | null

	return (
		<pre style={{ position: 'absolute', zIndex: 300, top: 64, left: 12, margin: 0 }}>
			{onlySelectedShape
				? JSON.stringify(onlySelectedShape.meta, null, '\t')
				: 'Select one shape to see its meta data.'}
		</pre>
	)
})

/* 
This example shows how to add meta data to shapes when they are created and
updated. In this case we are adding `updatedBy` and `updatedAt` fields.

[1]
getInitialMetaForShape is a method you can replace at runtime. Here we use 
a callback on the onMount prop to replace the default implementation with 
our own.

[2]
Here we're using the side effects API to add meta data to shapes when they are
updated. You can use the side effects API to do something on create, update or
delete, and you can target many things including: shapes, pages, the camera, 
the pointer etc.

[3]
All tldraw shapes have a meta property with a type of unknown. To type your 
meta data you can use a union like this.

[4]
A minimal ui component that displays the meta data of the selected shape. We 
use track to make sure that the component is re-rendered when the signals it's 
tracking change. Check out the signia docs for more info: 
https://signia.tldraw.dev/docs/API/signia_react/functions/track
*/
