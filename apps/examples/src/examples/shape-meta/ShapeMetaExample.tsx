import { TLShape, Tldraw, track, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
export default function ShapeMetaExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="shape_meta_example"
				onMount={(editor) => {
					editor.getInitialMetaForShape = (shape) => {
						return { label: `My ${shape.type} shape` }
					}
				}}
			>
				<ShapeLabelUiWithHelper />
			</Tldraw>
		</div>
	)
}

// [2]
type ShapeWithMyMeta = TLShape & { meta: { label: string } }

// [3]
export const ShapeLabelUiWithHelper = track(function ShapeLabelUiWithHelper() {
	const editor = useEditor()
	const onlySelectedShape = editor.getOnlySelectedShape() as ShapeWithMyMeta | null

	function onChange(e: React.ChangeEvent<HTMLInputElement>) {
		if (onlySelectedShape) {
			const { id, type, meta } = onlySelectedShape

			editor.updateShapes<ShapeWithMyMeta>([
				{ id, type, meta: { ...meta, label: e.currentTarget.value } },
			])
		}
	}

	return (
		<div style={{ position: 'absolute', zIndex: 300, top: 64, left: 12 }}>
			<pre style={{ margin: '0 0 16px 0' }}>
				{onlySelectedShape
					? JSON.stringify(onlySelectedShape.meta, null, '\t')
					: 'Select one shape to see / edit its meta data.'}
			</pre>
			{onlySelectedShape && <input value={onlySelectedShape.meta.label} onChange={onChange} />}
		</div>
	)
})

/* 
This example shows how to use the `getInitialMetaForShape` function to set initial
meta data for a shape and update it.

[1]
In the Tldraw component's `onMount` callback, we override the default 
`Editor.getInitialMetaForShape` function. This function is called when
a new shape is created and provides the `meta` property value for the 
new shape.

[2]
By default, the TLShape type's meta property is { [key: string]: any }, but we can type
it using a union like this.

[3]
This is our minimal ui for editing the meta data of our shapes. We use the `track` 
function to make sure this component is reactive, it will re-render when the signals
it is tracking change. Check out the signia docs for more: 
https://signia.tldraw.dev/docs/API/signia_react/functions/track

Because our component is a child of the Tldraw component, it has access to the `useEditor` 
hook via React context. We use this to get the only selected shape. If there is a single 
shape selected, we render the input and update the shape's meta data when the input changes 
via the `onChange` function.

*/
