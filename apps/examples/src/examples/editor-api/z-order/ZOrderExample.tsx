import { createShapeId, Tldraw, TldrawUiButton, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import './z-order.css'

const COLORS = ['red', 'blue', 'green', 'orange'] as const
const SHAPE_SIZE = 150
const OVERLAP = 110

export default function ZOrderExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
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
				}}
				components={{
					TopPanel: () => {
						const editor = useEditor()
						return (
							<div className="tlui-menu z-order-controls">
								{/* [1] */}
								<TldrawUiButton
									type="normal"
									onClick={() => editor.sendToBack(editor.getSelectedShapeIds())}
								>
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
					},
				}}
			/>
		</div>
	)
}

/*
[1]
There are four reordering methods in the reordering API:
- `sendToBack` and `bringToFront` move shapes to the very bottom or top.
- `sendBackward` and `bringForward` shift shapes one step. By default they
  only consider overlapping shapes; pass `{ considerAllShapes: true }` to
  move past non-overlapping shapes too (i.e. move exactly one position in the
  z-ordering).

When multiple shapes are selected, their relative order is preserved, so
they move as a group.
*/
