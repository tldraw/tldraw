import { TLComponents, TLEditorSnapshot, Tldraw, useEditor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'
import { ShapeList } from './ShapeList'
import './layer-panel.css'
import snapshot from './snapshot.json'

// There's a guide at the bottom of this file!

const components: TLComponents = {
	// [1]
	InFrontOfTheCanvas: () => {
		const editor = useEditor()
		const shapeIds = useValue(
			'shapeIds',
			() => editor.getSortedChildIdsForParent(editor.getCurrentPageId()),
			[editor]
		)
		return (
			<div className="layer-panel">
				<div className="layer-panel-title">Shapes</div>

				<ShapeList
					// [2]
					shapeIds={shapeIds}
					depth={0}
				/>
			</div>
		)
	},
}

export default function LayerPanelExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="layer-panel-example"
				components={components}
				// [3]
				getShapeVisibility={(s) =>
					s.meta.force_show ? 'visible' : s.meta.hidden ? 'hidden' : 'inherit'
				}
				// Initial content so the panel has something to show.
				snapshot={snapshot as unknown as TLEditorSnapshot}
			/>
		</div>
	)
}

/*
[1]
The panel is an `InFrontOfTheCanvas` component. It reads the current page's top-level
shape ids with `getSortedChildIdsForParent(pageId)` inside `useValue`, so it re-renders
when shapes are added, removed, or reordered.

[2]
`ShapeList` (see ShapeList.tsx) recurses into groups and frames using the same
`getSortedChildIdsForParent` call with a shape id as the parent.

[3]
`getShapeVisibility` decides whether a shape is hidden. The panel stores its choice in
`shape.meta`: `hidden` hides a shape (and, via 'inherit', its children); `force_show`
lets a child stay visible even when its parent is hidden.
*/
