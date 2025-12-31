import { Box, Editor, SVGContainer, TLGeoShape, Tldraw, toRichText } from 'tldraw'
import 'tldraw/tldraw.css'

// [1]
const CONTAINER_BOUNDS = new Box(100, 100, 400, 300)

// [2]
function constrainShapeToBounds(editor: Editor, shape: TLGeoShape) {
	const shapeGeometry = editor.getShapeGeometry(shape)
	const shapeBounds = shapeGeometry.bounds

	// Calculate the shape's world-space bounds
	const shapeWorldBounds = editor.getShapePageBounds(shape)

	if (!shapeWorldBounds) return shape

	// Check if the shape is completely within the container
	if (CONTAINER_BOUNDS.contains(shapeWorldBounds)) {
		return shape
	}

	// [3]
	// Calculate maximum allowed dimensions based on container size
	const maxWidth = CONTAINER_BOUNDS.w - shapeBounds.x * 2
	const maxHeight = CONTAINER_BOUNDS.h - shapeBounds.y * 2

	// Clamp the shape's size if it would exceed the container
	const clampedW = Math.min(shape.props.w, maxWidth)
	const clampedH = Math.min(shape.props.h, maxHeight)

	// Recalculate bounds with the clamped size
	const clampedShapeBounds = Box.From({
		x: shape.x + shapeBounds.x,
		y: shape.y + shapeBounds.y,
		w: (clampedW / shape.props.w) * shapeBounds.w,
		h: (clampedH / shape.props.h) * shapeBounds.h,
	})

	// Clamp the shape's position so it stays within bounds
	let clampedX = Math.max(
		CONTAINER_BOUNDS.x - shapeBounds.x,
		Math.min(shape.x, CONTAINER_BOUNDS.maxX - shapeBounds.x - clampedShapeBounds.w)
	)
	let clampedY = Math.max(
		CONTAINER_BOUNDS.y - shapeBounds.y,
		Math.min(shape.y, CONTAINER_BOUNDS.maxY - shapeBounds.y - clampedShapeBounds.h)
	)

	if (shapeBounds.w >= CONTAINER_BOUNDS.w) {
		clampedX = CONTAINER_BOUNDS.x
	}

	if (shapeBounds.h >= CONTAINER_BOUNDS.h) {
		clampedY = CONTAINER_BOUNDS.y
	}
	return {
		...shape,
		x: clampedX,
		y: clampedY,
		props: {
			...shape.props,
			w: clampedW,
			h: clampedH,
		},
	}
}

export default function PermissionsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					// [4]
					editor.sideEffects.registerBeforeChangeHandler('shape', (prevShape, nextShape) => {
						// Only constrain geo shapes (our rectangle)
						if (nextShape.type === 'geo') {
							return constrainShapeToBounds(editor, nextShape as TLGeoShape)
						}
						return nextShape
					})

					// [5]
					// Create the constrained rectangle
					editor.createShape({
						type: 'geo',
						x: 250,
						y: 200,
						props: {
							geo: 'rectangle',
							w: 150,
							h: 100,
							richText: toRichText('Try to drag me around'),
						},
					})

					// Zoom to show the container area
					editor.zoomToBounds(new Box(0, 0, 600, 500))
				}}
				components={{
					// [6]
					OnTheCanvas: () => (
						<SVGContainer>
							<rect
								x={CONTAINER_BOUNDS.x}
								y={CONTAINER_BOUNDS.y}
								width={CONTAINER_BOUNDS.w}
								height={CONTAINER_BOUNDS.h}
								fill="none"
								stroke="rgba(0, 0, 0, 0.2)"
								strokeWidth={2}
								strokeDasharray="8 4"
							/>
						</SVGContainer>
					),
				}}
			/>
		</div>
	)
}

/*
[1]
Define the invisible container bounds that our shape will be constrained to. This is a box
with top-left at (100, 100) and dimensions of 400x300.

[2]
This function checks if a shape's bounds extend outside the container and returns a modified
shape with clamped position if needed. We use editor.getShapeGeometry() to get the shape's
actual geometry including any padding or offsets.

[3]
First, calculate the maximum allowed dimensions and clamp the shape's size if needed. Then
clamp the position to keep the shape within bounds. This ensures the shape can neither be
moved nor resized outside the container.

[4]
Register a beforeChange handler that runs whenever any shape is about to be modified. We only
apply the constraint to geo shapes (rectangles). This handler intercepts changes and returns
a modified version of the shape with position clamped to the container.

[5]
Create a rectangle shape with text positioned inside our container bounds. Users can drag and
resize this shape, but it will be prevented from leaving or exceeding the container area.

[6]
Draw a dashed rectangle on the canvas to visualize the container bounds. This uses SVGContainer
to render directly on the canvas in world coordinates.
*/
