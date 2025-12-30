import { createShapeId, Tldraw, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import './request-align-and-distribute-shapes.css'

// [1]
const ALIGN_OPERATIONS = [
	{ operation: 'left', label: 'Align left' },
	{ operation: 'center-horizontal', label: 'Align center H' },
	{ operation: 'right', label: 'Align right' },
	{ operation: 'top', label: 'Align top' },
	{ operation: 'center-vertical', label: 'Align center V' },
	{ operation: 'bottom', label: 'Align bottom' },
] as const

function AlignButtons() {
	const editor = useEditor()

	return (
		<div className="align-distribute-controls">
			{ALIGN_OPERATIONS.map(({ operation, label }) => (
				<button
					key={operation}
					className="align-distribute-button"
					onClick={() => {
						// [2]
						const selectedIds = editor.getSelectedShapeIds()
						if (selectedIds.length > 1) {
							editor.alignShapes(selectedIds, operation)
						}
					}}
				>
					{label}
				</button>
			))}
		</div>
	)
}

// [3]
const DISTRIBUTE_OPERATIONS = [
	{ operation: 'horizontal', label: 'Distribute horizontal' },
	{ operation: 'vertical', label: 'Distribute vertical' },
] as const

function DistributeButtons() {
	const editor = useEditor()

	return (
		<div className="align-distribute-controls distribute-row">
			{DISTRIBUTE_OPERATIONS.map(({ operation, label }) => (
				<button
					key={operation}
					className="align-distribute-button"
					onClick={() => {
						// [4]
						const selectedIds = editor.getSelectedShapeIds()
						if (selectedIds.length > 2) {
							editor.distributeShapes(selectedIds, operation)
						}
					}}
				>
					{label}
				</button>
			))}
		</div>
	)
}

export default function RequestAlignAndDistributeShapesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					// [5]
					editor.createShapes([
						{
							id: createShapeId(),
							type: 'geo',
							x: 100,
							y: 100,
							props: {
								w: 100,
								h: 100,
								color: 'blue',
							},
						},
						{
							id: createShapeId(),
							type: 'geo',
							x: 300,
							y: 200,
							props: {
								w: 120,
								h: 80,
								color: 'red',
							},
						},
						{
							id: createShapeId(),
							type: 'geo',
							x: 500,
							y: 150,
							props: {
								w: 80,
								h: 120,
								color: 'green',
							},
						},
						{
							id: createShapeId(),
							type: 'geo',
							x: 150,
							y: 400,
							props: {
								w: 100,
								h: 100,
								color: 'violet',
							},
						},
						{
							id: createShapeId(),
							type: 'geo',
							x: 400,
							y: 450,
							props: {
								w: 90,
								h: 90,
								color: 'orange',
							},
						},
					])

					// [6]
					editor.selectAll()
				}}
				components={{
					// [7]
					TopPanel: () => (
						<>
							<AlignButtons />
							<DistributeButtons />
						</>
					),
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

[5]
Create 5 shapes at different positions with varying sizes and colors. This provides a good demonstration of the align and distribute operations. The shapes are positioned at varied coordinates to make the alignment and distribution effects clearly visible.

[6]
Select all shapes on mount so users can immediately try the align and distribute buttons without needing to manually select shapes first.

[7]
Use the TopPanel component to display the buttons above the canvas.
*/
