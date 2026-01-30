import { Tldraw, TldrawUiButton, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

export default function StackAndPackExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					// Only do this on an empty canvas
					if (editor.getCurrentPageShapeIds().size > 0) return

					// Create several shapes at random positions
					const colors = [
						'blue',
						'red',
						'green',
						'yellow',
						'orange',
						'violet',
						'light-blue',
						'light-green',
					] as const

					for (let i = 0; i < 8; i++) {
						editor.createShape({
							type: 'geo',
							x: Math.random() * 400 + 100,
							y: Math.random() * 300 + 100,
							props: {
								w: 60 + Math.random() * 40,
								h: 60 + Math.random() * 40,
								geo: 'rectangle',
								color: colors[i] as any,
								fill: 'solid',
							},
						})
					}
				}}
				components={{
					TopPanel: () => {
						return <LayoutControls />
					},
				}}
			/>
		</div>
	)
}

function LayoutControls() {
	const editor = useEditor()

	return (
		<div style={{ display: 'flex', gap: 8, padding: 8 }}>
			{/* [1] */}
			<TldrawUiButton
				type="normal"
				onClick={() => {
					const selectedShapeIds = editor.getSelectedShapeIds()
					if (selectedShapeIds.length === 0) return
					// Stack horizontally with 16px gap
					editor.stackShapes(selectedShapeIds, 'horizontal', 16)
				}}
			>
				Stack Horizontal
			</TldrawUiButton>

			{/* [2] */}
			<TldrawUiButton
				type="normal"
				onClick={() => {
					const selectedShapeIds = editor.getSelectedShapeIds()
					if (selectedShapeIds.length === 0) return
					// Stack vertically with auto-detected gap
					editor.stackShapes(selectedShapeIds, 'vertical')
				}}
			>
				Stack Vertical
			</TldrawUiButton>

			{/* [3] */}
			<TldrawUiButton
				type="normal"
				onClick={() => {
					const selectedShapeIds = editor.getSelectedShapeIds()
					if (selectedShapeIds.length === 0) return
					// Pack into a grid with 8px padding
					editor.packShapes(selectedShapeIds, 8)
				}}
			>
				Pack Grid
			</TldrawUiButton>

			{/* [4] */}
			<TldrawUiButton
				type="normal"
				onClick={() => {
					// Select all shapes
					editor.selectAll()
				}}
			>
				Select All
			</TldrawUiButton>
		</div>
	)
}

/*
Introduction:

This example shows how to use stackShapes() and packShapes() to automatically arrange
shapes into organized layouts.

[1]
editor.stackShapes(shapeIds, 'horizontal', gap) - Arranges shapes in a horizontal line.
- First parameter: array of shape IDs to stack
- Second parameter: 'horizontal' or 'vertical'
- Third parameter (optional): gap in pixels between shapes (if omitted, gap is auto-detected)

Stacking arranges shapes in sequence while maintaining their relative positions to each other.

[2]
editor.stackShapes(shapeIds, 'vertical') - Arranges shapes in a vertical line.
When the gap parameter is omitted, tldraw automatically detects an appropriate gap based on
the current spacing between selected shapes.

[3]
editor.packShapes(shapeIds, padding) - Arranges shapes into a compact grid using a
bin-packing algorithm.
- First parameter: array of shape IDs to pack
- Second parameter (optional): padding in pixels between shapes (default: 16)

Packing is useful for organizing scattered shapes into a tight, organized grid layout.

[4]
Both stacking and packing operations respect parent-child coordinate systems and work
correctly with shapes inside groups or frames.

Try it:
1. Click "Select All" to select all the randomly positioned shapes
2. Try "Stack Horizontal" to arrange them in a line
3. Try "Stack Vertical" for a vertical arrangement
4. Try "Pack Grid" to organize them into a compact grid
5. Create more shapes and experiment with different selections

Note: Shapes maintain their original size - only their positions are modified.
*/
