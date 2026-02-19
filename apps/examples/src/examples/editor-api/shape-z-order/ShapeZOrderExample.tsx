import { useCallback } from 'react'
import { Tldraw, TldrawUiButton, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import './shape-z-order.css'

// There's a guide at the bottom of this file!

// [1]
function ZOrderControls() {
	const editor = useEditor()

	const sendToBack = useCallback(() => {
		const selectedIds = editor.getSelectedShapeIds()
		if (selectedIds.length === 0) return
		editor.sendToBack(selectedIds)
	}, [editor])

	const sendBackward = useCallback(() => {
		const selectedIds = editor.getSelectedShapeIds()
		if (selectedIds.length === 0) return
		editor.sendBackward(selectedIds)
	}, [editor])

	const bringForward = useCallback(() => {
		const selectedIds = editor.getSelectedShapeIds()
		if (selectedIds.length === 0) return
		editor.bringForward(selectedIds)
	}, [editor])

	const bringToFront = useCallback(() => {
		const selectedIds = editor.getSelectedShapeIds()
		if (selectedIds.length === 0) return
		editor.bringToFront(selectedIds)
	}, [editor])

	return (
		<div className="z-order-controls">
			<TldrawUiButton type="normal" onClick={sendToBack}>
				Send to back
			</TldrawUiButton>
			<TldrawUiButton type="normal" onClick={sendBackward}>
				Send backward
			</TldrawUiButton>
			<TldrawUiButton type="normal" onClick={bringForward}>
				Bring forward
			</TldrawUiButton>
			<TldrawUiButton type="normal" onClick={bringToFront}>
				Bring to front
			</TldrawUiButton>
		</div>
	)
}

export default function ShapeZOrderExample() {
	return (
		<div className="tldraw__editor">
			{/* [2] */}
			<Tldraw
				onMount={(editor) => {
					if (editor.getCurrentPageShapeIds().size > 0) return

					// [3]
					editor.createShapes([
						{
							type: 'geo',
							x: 100,
							y: 100,
							props: { w: 200, h: 200, color: 'red', fill: 'solid' },
						},
						{
							type: 'geo',
							x: 200,
							y: 150,
							props: { w: 200, h: 200, color: 'blue', fill: 'solid' },
						},
						{
							type: 'geo',
							x: 300,
							y: 200,
							props: { w: 200, h: 200, color: 'green', fill: 'solid' },
						},
					])

					editor.zoomToFit({ animation: { duration: 0 } })
				}}
				components={{ TopPanel: ZOrderControls }}
			/>
		</div>
	)
}

/*
[1]
The control panel uses the `useEditor()` hook to access the editor instance. Each button calls one
of the four reordering methods with the currently selected shape ids.

The four methods are:
- `editor.sendToBack(ids)` — moves shapes to the bottom of the z-order
- `editor.sendBackward(ids)` — moves shapes one position down
- `editor.bringForward(ids)` — moves shapes one position up
- `editor.bringToFront(ids)` — moves shapes to the top of the z-order

[2]
The `ZOrderControls` component is passed as the `TopPanel` component override, which places it
above the canvas.

[3]
Three overlapping shapes are created with different colors so you can clearly see the stacking
order change when you select a shape and click the buttons.
*/
