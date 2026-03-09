import {
	Box,
	Editor,
	TLComponents,
	Tldraw,
	createShapeId,
	toRichText,
	track,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './selection-bounds.css'

// There's a guide at the bottom of this file!

const DEMO_IDS = {
	blue: createShapeId('selection-bounds-blue'),
	greenA: createShapeId('selection-bounds-green-a'),
	greenB: createShapeId('selection-bounds-green-b'),
	greenGroup: createShapeId('selection-bounds-green-group'),
	purple: createShapeId('selection-bounds-purple'),
	red: createShapeId('selection-bounds-red'),
	hint: createShapeId('selection-bounds-hint'),
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

	editor.createShapes([
		...DEMO_SHAPES,
		{
			id: DEMO_IDS.hint,
			type: 'text' as const,
			x: 880,
			y: 340,
			props: {
				richText: toRichText('⬆ Select both boxes,\nthen rotate them!'),
				color: 'grey' as const,
				size: 's' as const,
				autoSize: true,
			},
		},
	])
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

const SelectionBoundsOverlay = track(() => {
	const editor = useEditor()
	const axisAlignedBounds = editor.getSelectionPageBounds() // [1]
	const rotatedBounds = editor.getSelectionRotatedPageBounds() // [2]

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
This example shows how to read and visualize selection bounds. tldraw uses two
different kinds of bounds:

[1] `getSelectionPageBounds()` returns the axis-aligned bounding box of the
current selection (shown as the blue dashed box). It always has zero rotation —
it's the smallest upright rectangle that contains every selected shape. It isn't
visible; we use it for hit testing and viewport culling. 

[2] `getSelectionRotatedPageBounds()` returns the rotated selection box (shown
as the amber dashed box). When the selected shapes share a common rotation, this
box matches their orientation. We use this for the selection UI — if you
select two shapes rotated by the same angle, the resize handles align with the
shapes' axes so you can scale them without distortion. An axis-aligned box would
only let you resize horizontally and vertically relative to the page.

Try selecting the three groups of shapes on the canvas:
1. A single rotated shape: the AABB is different to the rotated.
2. Multiple shapes with a shared rotation, so the rotated bounds still aligns
to their common angle.
3. The purple and red pair: two ungrouped shapes with different rotations. If the
selected shapes are rotated by different amounts, there's no single angle that
makes sense for the selection box, so we fall back to an axis-aligned box and the
two bounds are identical. Select both and rotate them to see them collapse.
*/
