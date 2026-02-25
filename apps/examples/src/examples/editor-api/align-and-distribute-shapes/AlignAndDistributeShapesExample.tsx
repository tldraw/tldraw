import { useRef } from 'react'
import { createShapeId, Tldraw, TldrawUiButton, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import './align-and-distribute-shapes.css'

// [1]
const ALIGN_OPERATIONS = [
	{ operation: 'left', label: 'Align left' },
	{ operation: 'center-horizontal', label: 'Align center H' },
	{ operation: 'right', label: 'Align right' },
	{ operation: 'top', label: 'Align top' },
	{ operation: 'center-vertical', label: 'Align center V' },
	{ operation: 'bottom', label: 'Align bottom' },
] as const

function ControlPanel({
	originalPositions,
}: {
	originalPositions: React.RefObject<Map<string, { x: number; y: number }>>
}) {
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
						// [4]
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
					const shapes = editor.getCurrentPageShapes()
					editor.run(() => {
						for (const shape of shapes) {
							const originalPos = originalPositions.current?.get(shape.id)
							if (originalPos) {
								editor.updateShape({
									...shape,
									x: originalPos.x,
									y: originalPos.y,
								})
							}
						}
					})
				}}
			>
				Reset positions
			</TldrawUiButton>
		</div>
	)
}

// [3]
const DISTRIBUTE_OPERATIONS = [
	{ operation: 'horizontal', label: 'Distribute horizontal' },
	{ operation: 'vertical', label: 'Distribute vertical' },
] as const

export default function RequestAlignAndDistributeShapesExample() {
	const originalPositions = useRef(new Map<string, { x: number; y: number }>())

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
							props: {
								w: 100,
								h: 100,
								color: 'blue' as const,
							},
						},
						{
							id: createShapeId(),
							type: 'geo' as const,
							x: 300,
							y: 200,
							props: {
								w: 120,
								h: 80,
								color: 'red' as const,
							},
						},
						{
							id: createShapeId(),
							type: 'geo' as const,
							x: 500,
							y: 150,
							props: {
								w: 80,
								h: 120,
								color: 'green' as const,
							},
						},
						{
							id: createShapeId(),
							type: 'geo' as const,
							x: 150,
							y: 400,
							props: {
								w: 100,
								h: 100,
								color: 'violet' as const,
							},
						},
						{
							id: createShapeId(),
							type: 'geo' as const,
							x: 400,
							y: 450,
							props: {
								w: 90,
								h: 90,
								color: 'orange' as const,
							},
						},
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
Define an array of all align operations with their labels. This makes it easy to render buttons for each operation without repetition. The available operations are: left, center-horizontal, right (horizontal alignment), and top, center-vertical, bottom (vertical alignment).

[2]
The alignShapes method requires at least 2 shapes to be selected. It aligns the selected shapes based on the specified operation. The shapes parameter can be either shape IDs or shape objects.

[3]
Define an array of distribute operations. Distribution evenly spaces shapes along the specified axis: horizontal or vertical.

[4]
The distributeShapes method requires at least 3 shapes to be selected. It distributes shapes evenly along the horizontal or vertical axis, maintaining equal spacing between them.
*/
