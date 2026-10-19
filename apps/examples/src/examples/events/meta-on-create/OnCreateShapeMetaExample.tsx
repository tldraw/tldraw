import { TLComponents, TLShape, Tldraw, useEditor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
type ShapeWithMyMeta = TLShape & { meta: { createdBy: string; createdAt: number } }

function MetaUiHelper() {
	const editor = useEditor()
	// [2]
	const onlySelectedShape = useValue(
		'only selected shape',
		() => editor.getOnlySelectedShape() as ShapeWithMyMeta | null,
		[editor]
	)

	return (
		<pre className="tlui-menu" style={{ margin: 0, padding: 8 }}>
			{onlySelectedShape
				? JSON.stringify(onlySelectedShape.meta, null, '\t')
				: 'Select one shape to see its meta data.'}
		</pre>
	)
}

const components: TLComponents = {
	TopPanel: MetaUiHelper,
}

export default function OnCreateShapeMetaExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="meta-on-create-example"
				components={components}
				onMount={(editor) => {
					// [3]
					editor.getInitialMetaForShape = (_shape) => {
						return {
							createdBy: editor.user.getExternalId(),
							createdAt: Date.now(),
						}
					}
				}}
			/>
		</div>
	)
}

/*
Every shape has a `meta` property for your own JSON data. tldraw stores and syncs it but never
reads it. This example records who created each shape and when. See the shapes docs for more on
meta: https://tldraw.dev/docs/shapes#meta

[1]
A shape's `meta` is typed as `JsonObject`. To get useful types for your own fields, intersect
the shape type with the shape of your meta.

[2]
Reading `editor.getOnlySelectedShape()` inside `useValue` re-renders this panel whenever the
selection changes.

[3]
`getInitialMetaForShape` is called by `createShapes` for every new shape. Its result is merged
with any `meta` passed to `createShapes`, with the explicit meta winning. It's a plain method on
the editor, so the simplest way to customize it is to replace it in `onMount`. The shape is
passed in, so you can return different meta for different shape types.
*/
