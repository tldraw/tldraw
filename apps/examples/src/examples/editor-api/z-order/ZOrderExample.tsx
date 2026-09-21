import { createShapeId, Editor, TLComponents, Tldraw, TldrawUiButton, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import './z-order.css'

// There's a guide at the bottom of this file!

const COLORS = ['red', 'blue', 'green', 'orange'] as const
const SHAPE_SIZE = 150
const OVERLAP = 110

function ZOrderControls() {
	const editor = useEditor()
	return (
		<div className="tlui-menu z-order-controls">
			{/* [1] */}
			<TldrawUiButton type="normal" onClick={() => editor.sendToBack(editor.getSelectedShapeIds())}>
				Send to back
			</TldrawUiButton>
			<TldrawUiButton
				type="normal"
				onClick={() => editor.sendBackward(editor.getSelectedShapeIds())}
			>
				Send backward
			</TldrawUiButton>
			<TldrawUiButton
				type="normal"
				onClick={() => editor.bringForward(editor.getSelectedShapeIds())}
			>
				Bring forward
			</TldrawUiButton>
			<TldrawUiButton
				type="normal"
				onClick={() => editor.bringToFront(editor.getSelectedShapeIds())}
			>
				Bring to front
			</TldrawUiButton>
		</div>
	)
}

const components: TLComponents = {
	TopPanel: ZOrderControls,
}

function handleMount(editor: Editor) {
	if (editor.getCurrentPageShapeIds().size > 0) return

	editor.createShapes(
		COLORS.map((color, i) => ({
			id: createShapeId(),
			type: 'geo' as const,
			x: 200 + i * (SHAPE_SIZE - OVERLAP),
			y: 200 + i * (SHAPE_SIZE - OVERLAP),
			props: {
				w: SHAPE_SIZE,
				h: SHAPE_SIZE,
				color,
				fill: 'solid' as const,
			},
		}))
	)

	editor.zoomToFit({ animation: { duration: 0 } })
}

export default function ZOrderExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw onMount={handleMount} components={components} />
		</div>
	)
}

/*
[1]
`sendToBack` and `bringToFront` move shapes to the very bottom or top of their parent. `sendBackward`
and `bringForward` shift them one step, and by default only past shapes they overlap, which is what
you want from a UI button: moving past a shape on the other side of the page would look like nothing
happened. Pass `{ considerAllShapes: true }` to move exactly one position in the z-order regardless.

When several shapes are selected, their relative order is preserved, so they move as a block.
*/
