import { TLComponents, TLEditorSnapshot, Tldraw, useEditor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'
import { ShapeList } from './ShapeList'
import './layer-panel.css'
import snapshot from './snapshot.json'

// There's a guide a the bottom of this file!

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
				// this is just to provide some initial content, so visitors can see the layer panel in action
				snapshot={snapshot as any as TLEditorSnapshot}
			/>
		</div>
	)
}

/*
Guide:

1. Here we override the `InFrontOfTheCanvas` component with a custom component that renders a simple layer panel.
2. We pass the root ids of the current page to the recursive ShapeList component. (see ShapeList.tsx)
3. This is a function that determines whether a shape is hidden. We use this to hide shapes that have the `hidden` meta property set to true.
*/
