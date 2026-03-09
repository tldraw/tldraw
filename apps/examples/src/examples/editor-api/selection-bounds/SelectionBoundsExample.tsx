import { Box, Editor, TLComponents, Tldraw, createShapeId, track, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import './selection-bounds.css'

// There's a guide at the bottom of this file!

// [1]
const DEMO_IDS = {
	blue: createShapeId('selection-bounds-blue'),
	greenA: createShapeId('selection-bounds-green-a'),
	greenB: createShapeId('selection-bounds-green-b'),
	greenGroup: createShapeId('selection-bounds-green-group'),
	purple: createShapeId('selection-bounds-purple'),
	red: createShapeId('selection-bounds-red'),
} as const

const ALL_DEMO_IDS = Object.values(DEMO_IDS)
const SAME_ROTATION = Math.PI / 6

const DEMO_SHAPES: Parameters<Editor['createShapes']>[0] = [
	{
		id: DEMO_IDS.blue,
		type: 'geo' as const,
		x: 120,
		y: 250,
		rotation: SAME_ROTATION,
		props: {
			geo: 'rectangle' as const,
			w: 180,
			h: 110,
			color: 'blue' as const,
			fill: 'semi' as const,
			dash: 'draw' as const,
		},
	},
	{
		id: DEMO_IDS.greenA,
		type: 'geo' as const,
		x: 430,
		y: 205,
		props: {
			geo: 'rectangle' as const,
			w: 140,
			h: 80,
			color: 'green' as const,
			fill: 'semi' as const,
			dash: 'solid' as const,
		},
	},
	{
		id: DEMO_IDS.greenB,
		type: 'geo' as const,
		x: 610,
		y: 245,
		props: {
			geo: 'rectangle' as const,
			w: 120,
			h: 70,
			color: 'green' as const,
			fill: 'semi' as const,
			dash: 'solid' as const,
		},
	},
	{
		id: DEMO_IDS.purple,
		type: 'geo' as const,
		x: 880,
		y: 205,
		rotation: Math.PI / 8,
		props: {
			geo: 'rectangle' as const,
			w: 130,
			h: 80,
			color: 'violet' as const,
			fill: 'semi' as const,
			dash: 'solid' as const,
		},
	},
	{
		id: DEMO_IDS.red,
		type: 'geo' as const,
		x: 1040,
		y: 260,
		rotation: -Math.PI / 10,
		props: {
			geo: 'rectangle' as const,
			w: 130,
			h: 80,
			color: 'red' as const,
			fill: 'semi' as const,
			dash: 'solid' as const,
		},
	},
]

function seedDemoContent(editor: Editor) {
	const existingDemoShapeIds = ALL_DEMO_IDS.filter((id) => editor.getShape(id))

	if (existingDemoShapeIds.length) {
		editor.deleteShapes(existingDemoShapeIds)
	}

	editor.createShapes(DEMO_SHAPES)
	editor.groupShapes([DEMO_IDS.greenA, DEMO_IDS.greenB], {
		groupId: DEMO_IDS.greenGroup,
		select: false,
	})
	editor.updateShapes([{ id: DEMO_IDS.greenGroup, type: 'group', rotation: SAME_ROTATION }])
	editor.select(DEMO_IDS.blue)
	editor.zoomToFit({ animation: { duration: 0 } })
}

const BOUNDS_EQUALITY_EPSILON = 0.1
const ROTATION_EQUALITY_EPSILON = 0.0001

function areBoundsEqual(a: Box, b: Box) {
	return (
		Math.abs(a.x - b.x) < BOUNDS_EQUALITY_EPSILON &&
		Math.abs(a.y - b.y) < BOUNDS_EQUALITY_EPSILON &&
		Math.abs(a.width - b.width) < BOUNDS_EQUALITY_EPSILON &&
		Math.abs(a.height - b.height) < BOUNDS_EQUALITY_EPSILON
	)
}

function hasMixedSelectionRotations(editor: Editor) {
	const rotations = editor
		.getSelectedShapeIds()
		.map((id) => editor.getShapePageTransform(id)?.rotation())
		.filter((rotation): rotation is number => rotation !== undefined)

	if (rotations.length < 2) return false

	const firstRotation = rotations[0]
	return rotations.some(
		(rotation) => Math.abs(rotation - firstRotation) > ROTATION_EQUALITY_EPSILON
	)
}

// [2]
const SelectionBoundsOverlay = track(() => {
	const editor = useEditor()
	const axisAlignedBounds = editor.getSelectionPageBounds()
	const rotatedBounds = editor.getSelectionRotatedPageBounds()

	if (!axisAlignedBounds || !rotatedBounds) return null

	const zoom = editor.getZoomLevel()
	const rotation = editor.getSelectionRotation()
	const axisAlignedViewportPoint = editor.pageToViewport(axisAlignedBounds.point)
	const rotatedViewportPoint = editor.pageToViewport(rotatedBounds.point)
	const boundsMatch = areBoundsEqual(axisAlignedBounds, rotatedBounds)
	const mixedRotations = hasMixedSelectionRotations(editor)

	const showCombinedLabel = boundsMatch && mixedRotations
	const showSingleAxisLabel = boundsMatch && !mixedRotations

	return (
		<>
			{showCombinedLabel ? (
				<div
					className="selection-bounds-label selection-bounds-label--combined"
					style={{
						transform: `translate(${axisAlignedViewportPoint.x}px, ${Math.max(
							24,
							axisAlignedViewportPoint.y - 24
						)}px)`,
					}}
				>
					Axis-aligned + rotated
				</div>
			) : showSingleAxisLabel ? (
				<div
					className="selection-bounds-label selection-bounds-label--axis"
					style={{
						transform: `translate(${axisAlignedViewportPoint.x}px, ${Math.max(
							24,
							axisAlignedViewportPoint.y - 24
						)}px)`,
					}}
				>
					Axis-aligned
				</div>
			) : (
				<>
					<div
						className="selection-bounds-label selection-bounds-label--axis"
						style={{
							transform: `translate(${axisAlignedViewportPoint.x}px, ${Math.max(
								24,
								axisAlignedViewportPoint.y - 24
							)}px)`,
						}}
					>
						Axis-aligned
					</div>
					<div
						className="selection-bounds-label selection-bounds-label--rotated"
						style={{
							transform: `translate(${rotatedViewportPoint.x}px, ${Math.max(
								48,
								rotatedViewportPoint.y - 24
							)}px)`,
						}}
					>
						Rotated
					</div>
				</>
			)}
			<div
				className="selection-bounds-box selection-bounds-box--axis"
				style={{
					width: axisAlignedBounds.width * zoom,
					height: axisAlignedBounds.height * zoom,
					transform: `translate(${axisAlignedViewportPoint.x}px, ${axisAlignedViewportPoint.y}px)`,
				}}
			/>
			<div
				className="selection-bounds-box selection-bounds-box--rotated"
				style={{
					width: rotatedBounds.width * zoom,
					height: rotatedBounds.height * zoom,
					transform: `translate(${rotatedViewportPoint.x}px, ${rotatedViewportPoint.y}px) rotate(${rotation}rad)`,
				}}
			/>
		</>
	)
})

const components: TLComponents = {
	InFrontOfTheCanvas: SelectionBoundsOverlay,
}

export default function SelectionBoundsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="selection-bounds-example"
				components={components}
				onMount={(editor) => {
					if (ALL_DEMO_IDS.every((id) => editor.getShape(id))) {
						return
					}

					seedDemoContent(editor)
				}}
			/>
		</div>
	)
}

/*
This example demonstrates the difference between `getSelectionPageBounds()` and
`getSelectionRotatedPageBounds()` for the current selection.

[1]
The example keeps stable ids for the demo shapes and groups so it can rebuild the same seeded
cases even when the example uses local persistence. The seed includes a single blue rectangle,
a green group whose rectangles share a rotation, and a purple/red pair left ungrouped so you can
select both shapes together.

These three cases expose the main bounds behaviors this example is trying to teach:
- The blue rectangle is the simplest case. Its axis-aligned bounds and rotated bounds diverge as
  soon as the single shape is rotated.
- The green group shows that multiple shapes can still have a meaningful shared rotation. Because
  both child rectangles rotate together, `getSelectionRotatedPageBounds()` still reports a rotated
  box aligned to that common angle.
- The purple/red pair shows the mixed-rotation case. Select both shapes and rotate them so they no
  longer share one local axis. At that point `getSelectionRotation()` falls back to zero and the
  rotated bounds collapse to the same result as the axis-aligned bounds.

[2]
The overlay uses `track` so it reacts to editor state directly. It reads the selection's
axis-aligned bounds, rotated bounds, shared rotation, and viewport positions on each render.
When both bounds resolve to the same box because the selection contains mixed rotations, the
overlay collapses the two labels into one combined label.

[3]
The overlay converts both page-space boxes into viewport coordinates with `pageToViewport()`.
The blue rectangle is drawn directly from `getSelectionPageBounds()`. The amber rectangle uses
`getSelectionRotatedPageBounds()` plus `getSelectionRotation()` so it stays aligned with the
selection's own axes.
*/
