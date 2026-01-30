import { Tldraw, TldrawUiButton, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

export default function ShapeZOrderExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					// Only do this on an empty canvas
					if (editor.getCurrentPageShapeIds().size > 0) return

					// Create overlapping shapes to demonstrate z-order
					editor.createShapes([
						{
							type: 'geo',
							x: 100,
							y: 100,
							props: {
								w: 150,
								h: 150,
								geo: 'rectangle',
								color: 'blue',
								fill: 'solid',
							},
						},
						{
							type: 'geo',
							x: 150,
							y: 150,
							props: {
								w: 150,
								h: 150,
								geo: 'rectangle',
								color: 'red',
								fill: 'solid',
							},
						},
						{
							type: 'geo',
							x: 200,
							y: 200,
							props: {
								w: 150,
								h: 150,
								geo: 'rectangle',
								color: 'green',
								fill: 'solid',
							},
						},
					])
				}}
				components={{
					TopPanel: () => {
						return <ZOrderControls />
					},
				}}
			/>
		</div>
	)
}

function ZOrderControls() {
	const editor = useEditor()

	return (
		<div style={{ display: 'flex', gap: 8, padding: 8 }}>
			{/* [1] */}
			<TldrawUiButton
				type="normal"
				onClick={() => {
					const selectedShapeIds = editor.getSelectedShapeIds()
					if (selectedShapeIds.length === 0) return
					editor.sendToBack(selectedShapeIds)
				}}
			>
				Send to Back
			</TldrawUiButton>

			{/* [2] */}
			<TldrawUiButton
				type="normal"
				onClick={() => {
					const selectedShapeIds = editor.getSelectedShapeIds()
					if (selectedShapeIds.length === 0) return
					editor.sendBackward(selectedShapeIds)
				}}
			>
				Send Backward
			</TldrawUiButton>

			{/* [3] */}
			<TldrawUiButton
				type="normal"
				onClick={() => {
					const selectedShapeIds = editor.getSelectedShapeIds()
					if (selectedShapeIds.length === 0) return
					editor.bringForward(selectedShapeIds)
				}}
			>
				Bring Forward
			</TldrawUiButton>

			{/* [4] */}
			<TldrawUiButton
				type="normal"
				onClick={() => {
					const selectedShapeIds = editor.getSelectedShapeIds()
					if (selectedShapeIds.length === 0) return
					editor.bringToFront(selectedShapeIds)
				}}
			>
				Bring to Front
			</TldrawUiButton>
		</div>
	)
}

/*
Introduction:

This example shows how to programmatically control shape z-order (stacking/layering) using
tldraw's reordering methods.

[1]
editor.sendToBack(shapeIds) - Moves the specified shapes to the bottom of the z-order.
When multiple shapes are selected, their relative order to each other is preserved.

[2]
editor.sendBackward(shapeIds) - Moves the specified shapes one position down in the z-order.

[3]
editor.bringForward(shapeIds) - Moves the specified shapes one position up in the z-order.

[4]
editor.bringToFront(shapeIds) - Moves the specified shapes to the top of the z-order.
When multiple shapes are selected, their relative order to each other is preserved.

Note:
- By default, these methods only reorder shapes that overlap each other (occupy the same space).
- Use the { considerAllShapes: true } option to reorder shapes regardless of whether they overlap.
- Z-order indices are managed automatically by tldraw - you don't need to track them manually.
- All selected shapes maintain their relative order to each other when moved together.

Usage example with options:
editor.bringToFront(selectedShapeIds, { considerAllShapes: true })

Try it:
1. Select one of the overlapping colored rectangles
2. Use the buttons to change its z-order
3. Try selecting multiple shapes and reordering them together
*/
