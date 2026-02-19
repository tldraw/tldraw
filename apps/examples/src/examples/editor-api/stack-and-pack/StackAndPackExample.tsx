import { useRef } from 'react'
import { createShapeId, Tldraw, TldrawUiButton, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import './stack-and-pack.css'

// [1]
const GAP = 16

function ControlPanel({
	originalPositions,
}: {
	originalPositions: React.RefObject<Map<string, { x: number; y: number }>>
}) {
	const editor = useEditor()

	return (
		<div className="tlui-menu control-panel">
			<TldrawUiButton
				type="normal"
				onClick={() => {
					// [2]
					const ids = editor.getSelectedShapeIds()
					if (ids.length > 1) {
						editor.stackShapes(ids, 'horizontal', GAP)
					}
				}}
			>
				Stack horizontal
			</TldrawUiButton>
			<TldrawUiButton
				type="normal"
				onClick={() => {
					const ids = editor.getSelectedShapeIds()
					if (ids.length > 1) {
						editor.stackShapes(ids, 'vertical', GAP)
					}
				}}
			>
				Stack vertical
			</TldrawUiButton>
			<TldrawUiButton
				type="normal"
				onClick={() => {
					// [3]
					const ids = editor.getSelectedShapeIds()
					if (ids.length > 1) {
						editor.packShapes(ids, GAP)
					}
				}}
			>
				Pack
			</TldrawUiButton>
			<TldrawUiButton
				type="normal"
				onClick={() => {
					// [4]
					const shapes = editor.getCurrentPageShapes()
					editor.run(() => {
						for (const shape of shapes) {
							const pos = originalPositions.current?.get(shape.id)
							if (pos) {
								editor.updateShape({ ...shape, x: pos.x, y: pos.y })
							}
						}
					})
				}}
			>
				Reset
			</TldrawUiButton>
		</div>
	)
}

export default function StackAndPackExample() {
	const originalPositions = useRef(new Map<string, { x: number; y: number }>())

	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					// [5]
					const shapes = [
						{ id: createShapeId(), type: 'geo' as const, x: 50, y: 300, props: { w: 100, h: 100, color: 'blue' as const } },
						{ id: createShapeId(), type: 'geo' as const, x: 400, y: 50, props: { w: 150, h: 80, color: 'red' as const } },
						{ id: createShapeId(), type: 'geo' as const, x: 250, y: 400, props: { w: 80, h: 120, color: 'green' as const } },
						{ id: createShapeId(), type: 'geo' as const, x: 500, y: 200, props: { w: 120, h: 90, color: 'violet' as const } },
						{ id: createShapeId(), type: 'geo' as const, x: 100, y: 150, props: { w: 90, h: 110, color: 'orange' as const } },
						{ id: createShapeId(), type: 'geo' as const, x: 350, y: 350, props: { w: 110, h: 100, color: 'yellow' as const } },
					]

					for (const shape of shapes) {
						originalPositions.current.set(shape.id, { x: shape.x, y: shape.y })
					}

					editor.createShapes(shapes)
					editor.selectAll()
				}}
				components={{
					TopPanel: () => <ControlPanel originalPositions={originalPositions} />,
				}}
			/>
		</div>
	)
}

/*
[1]
The gap constant (in pixels) used for both stacking and packing operations. You can also
omit the gap parameter to let the editor automatically detect spacing from the current
arrangement of the selected shapes.

[2]
stackShapes arranges shapes in a line along the specified axis. It requires at least 2 shapes.
The third parameter is the gap between shapes in pixels. Shapes are ordered by their current
position along the stacking axis.

[3]
packShapes uses a bin-packing algorithm to arrange shapes into a compact rectangular grid.
This is useful for tidying up scattered shapes into an organized layout. The second parameter
controls the padding between packed shapes.

[4]
Reset all shapes to their original scattered positions so you can try the operations again.

[5]
Create six shapes at scattered positions with varying sizes so the layout operations are
clearly visible. Different sizes make packing especially interesting since the algorithm
has to fit shapes of different dimensions together.
*/
