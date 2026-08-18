import { createShapeId, TLComponents, Tldraw, TldrawUiButton, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import './align-and-distribute-shapes.css'

// There's a guide at the bottom of this file!

// [1]
const ALIGN_OPERATIONS = [
	{ operation: 'left', label: 'Align left' },
	{ operation: 'center-horizontal', label: 'Align center H' },
	{ operation: 'right', label: 'Align right' },
	{ operation: 'top', label: 'Align top' },
	{ operation: 'center-vertical', label: 'Align center V' },
	{ operation: 'bottom', label: 'Align bottom' },
	{ operation: 'center', label: 'Align center' },
] as const

const DISTRIBUTE_OPERATIONS = [
	{ operation: 'horizontal', label: 'Distribute horizontal' },
	{ operation: 'vertical', label: 'Distribute vertical' },
] as const

// Original positions of the demo shapes, captured on mount so "Reset positions" can restore them.
const originalPositions = new Map<string, { x: number; y: number }>()

function ControlPanel() {
	const editor = useEditor()

	return (
		<div className="tlui-menu control-panel">
			{ALIGN_OPERATIONS.map(({ operation, label }) => (
				<TldrawUiButton
					type="normal"
					key={operation}
					onClick={() => {
						// [2]
						const selectedIds = editor.getSelectedShapeIds()
						if (selectedIds.length > 1) {
							editor.alignShapes(selectedIds, operation)
						}
					}}
				>
					{label}
				</TldrawUiButton>
			))}
			{DISTRIBUTE_OPERATIONS.map(({ operation, label }) => (
				<TldrawUiButton
					type="normal"
					key={operation}
					onClick={() => {
						// [3]
						const selectedIds = editor.getSelectedShapeIds()
						if (selectedIds.length > 2) {
							editor.distributeShapes(selectedIds, operation)
						}
					}}
				>
					{label}
				</TldrawUiButton>
			))}
			<TldrawUiButton
				type="normal"
				onClick={() => {
					// [4]
					editor.updateShapes(
						editor.getCurrentPageShapes().flatMap((shape) => {
							const originalPos = originalPositions.get(shape.id)
							return originalPos ? [{ ...shape, ...originalPos }] : []
						})
					)
				}}
			>
				Reset positions
			</TldrawUiButton>
		</div>
	)
}

// [5]
const components: TLComponents = {
	TopPanel: ControlPanel,
}

export default function AlignAndDistributeShapesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					const shapes = [
						{
							id: createShapeId(),
							type: 'geo' as const,
							x: 100,
							y: 100,
							props: { w: 100, h: 100, color: 'blue' as const },
						},
						{
							id: createShapeId(),
							type: 'geo' as const,
							x: 300,
							y: 200,
							props: { w: 120, h: 80, color: 'red' as const },
						},
						{
							id: createShapeId(),
							type: 'geo' as const,
							x: 500,
							y: 150,
							props: { w: 80, h: 120, color: 'green' as const },
						},
						{
							id: createShapeId(),
							type: 'geo' as const,
							x: 150,
							y: 400,
							props: { w: 100, h: 100, color: 'violet' as const },
						},
						{
							id: createShapeId(),
							type: 'geo' as const,
							x: 400,
							y: 450,
							props: { w: 90, h: 90, color: 'orange' as const },
						},
					]

					originalPositions.clear()
					for (const shape of shapes) {
						originalPositions.set(shape.id, { x: shape.x, y: shape.y })
					}

					editor.createShapes(shapes)
					editor.selectAll()
				}}
				components={components}
			/>
		</div>
	)
}

/*
[1]
The operation names accepted by `editor.alignShapes` and `editor.distributeShapes`. Listing them
in a typed array lets us render one button per operation.

[2]
`alignShapes` moves the selected shapes so their edges (or centers) line up. It needs at least
two shapes; with fewer there is nothing to align to.

[3]
`distributeShapes` keeps the outermost two shapes where they are and spaces the ones in between
evenly, so it needs at least three shapes to do anything.

[4]
`updateShapes` applies all the position changes in one call, so a single undo restores every
shape.

[5]
Define `components` at module level so the `TopPanel` component identity is stable across renders.
Defining it inline would remount the panel every time the parent re-renders.
*/
