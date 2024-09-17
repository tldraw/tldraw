import { TLShape, Tldraw, track, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

export default function OnCreateShapeMetaExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="example"
				onMount={(editor) => {
					//[1]
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

// [2]
type ShapeWithMyMeta = TLShape & { meta: { updatedBy: string; updatedAt: string } }

// [3]
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
This is example demonstrates how to add your own data to shapes using the meta property as they're
created. Check out the docs for a more detailed explanation of the meta property: 
https://tldraw.dev/docs/shapes#Meta-information

[1]
getInitialMetaForShape is a method you can replace at runtime. Here we use a callback on the onMount
prop to replace the default implementation with our own.

[2]
All tldraw shapes have a meta property with a type of unknown. To type your meta data you can use 
a union like this.

[3]
A minimal ui component that displays the meta data of the selected shape. We use track to make sure
that the component is re-rendered when the signals it's tracking change. Check out the signia docs
for more info: https://signia.tldraw.dev/docs/API/signia_react/functions/track

*/
