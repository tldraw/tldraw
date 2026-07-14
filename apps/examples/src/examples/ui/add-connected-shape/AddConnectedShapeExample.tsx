import { Editor, TLComponents, Tldraw, TLShape, createShapeId, track, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import './add-connected-shape.css'

// There's a guide at the bottom of this file!

// [1]
const DIRECTIONS = [
	{ name: 'up', dx: 0, dy: -1 },
	{ name: 'right', dx: 1, dy: 0 },
	{ name: 'down', dx: 0, dy: 1 },
	{ name: 'left', dx: -1, dy: 0 },
] as const

type Direction = (typeof DIRECTIONS)[number]

const GAP = 80
const BUTTON_OFFSET = 24

// [2]
function addConnectedShape(editor: Editor, shape: TLShape, direction: Direction) {
	const bounds = editor.getShapePageBounds(shape.id)
	if (!bounds) return

	editor.run(() => {
		editor.markHistoryStoppingPoint('add connected shape')

		// [3]
		editor.duplicateShapes([shape.id], {
			x: direction.dx * (bounds.width + GAP),
			y: direction.dy * (bounds.height + GAP),
		})

		const newShape = editor.getOnlySelectedShape()
		if (!newShape) return

		// [4]
		const arrowId = createShapeId()
		editor.createShape({
			id: arrowId,
			type: 'arrow',
			x: bounds.center.x,
			y: bounds.center.y,
		})

		editor.createBindings([
			{
				fromId: arrowId,
				toId: shape.id,
				type: 'arrow',
				props: {
					terminal: 'start',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: false,
				},
			},
			{
				fromId: arrowId,
				toId: newShape.id,
				type: 'arrow',
				props: {
					terminal: 'end',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: false,
				},
			},
		])
	})
}

// [5]
const AddConnectedShapeButtons = track(() => {
	const editor = useEditor()

	if (!editor.isIn('select.idle')) return null

	const shape = editor.getOnlySelectedShape()
	if (!shape || editor.isShapeOfType(shape, 'arrow')) return null

	const bounds = editor.getShapePageBounds(shape.id)
	if (!bounds) return null

	return (
		<>
			{DIRECTIONS.map((direction) => {
				// [6]
				const edgeMidpoint = editor.pageToViewport({
					x: bounds.center.x + direction.dx * (bounds.width / 2),
					y: bounds.center.y + direction.dy * (bounds.height / 2),
				})

				return (
					<button
						key={direction.name}
						className="add-connected-button"
						style={{
							transform: `translate(${edgeMidpoint.x + direction.dx * BUTTON_OFFSET}px, ${edgeMidpoint.y + direction.dy * BUTTON_OFFSET}px)`,
						}}
						onPointerDown={(e) => e.stopPropagation()}
						onClick={() => addConnectedShape(editor, shape, direction)}
					>
						+
					</button>
				)
			})}
		</>
	)
})

const components: TLComponents = {
	InFrontOfTheCanvas: AddConnectedShapeButtons,
}

export default function AddConnectedShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				components={components}
				onMount={(editor) => {
					if (editor.getCurrentPageShapeIds().size > 0) return

					const id = createShapeId()
					const { x, y } = editor.getViewportPageBounds().center
					editor.createShape({
						id,
						type: 'geo',
						x: x - 80,
						y: y - 50,
						props: { w: 160, h: 100, fill: 'semi', color: 'light-blue' },
					})
					editor.select(id)
				}}
			/>
		</div>
	)
}

/*
This example shows how to add "plus" buttons around a selected shape that create
a new connected shape in that direction, similar to quick-connect affordances in
tools like Figma and FigJam.

[1]
Each button corresponds to a direction. The dx/dy unit vector is used both to
position the button on the selection edge and to place the new shape.

[2]
When a button is clicked, we create the new shape and connect it with an arrow
inside a single `editor.run()` transaction. `markHistoryStoppingPoint` makes the
whole operation undoable in one step.

[3]
`duplicateShapes` clones the selected shape (keeping its type, size, and styles)
at a page-space offset in the chosen direction, and selects the copy — so the
user can keep tapping a plus button to grow the diagram.

[4]
To connect the two shapes we create an arrow shape and bind each terminal to a
shape with `createBindings`. With `isPrecise: false` the arrow targets the
center of each shape and gracefully stops at the shape's outline, so it always
leaves from the correct edge no matter where the shapes move.

[5]
The buttons are rendered in the `InFrontOfTheCanvas` component slot: above the
canvas, below the rest of the UI. The component is wrapped in `track()` so it
re-renders when the selection, camera, or state chart changes. We only show the
buttons when exactly one non-arrow shape is selected and the select tool is
idle, so they disappear while translating, resizing, or pointing.

[6]
The shape's page bounds are converted to viewport (screen) coordinates with
`pageToViewport`, and each button is pushed a fixed number of screen pixels
away from the edge so the buttons stay the same size at any zoom level. This
example uses the shape's axis-aligned page bounds, so the buttons stay upright
even when the shape is rotated.
*/
