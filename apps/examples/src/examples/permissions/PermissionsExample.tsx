import { Box, Editor, SVGContainer, TLGeoShape, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// [1]
const CONTAINER_BOUNDS = new Box(100, 100, 400, 300)

// [2]
function constrainShapeToBounds(editor: Editor, shape: TLGeoShape) {
	const shapeGeometry = editor.getShapeGeometry(shape)
	const shapeBounds = shapeGeometry.bounds

	// Calculate the shape's world-space bounds
	const shapeWorldBounds = Box.From({
		x: shape.x + shapeBounds.x,
		y: shape.y + shapeBounds.y,
		w: shapeBounds.w,
		h: shapeBounds.h,
	})

	// Check if the shape is completely within the container
	if (CONTAINER_BOUNDS.contains(shapeWorldBounds)) {
		return shape
	}

	// [3]
	// Clamp the shape's position so it stays within bounds
	const clampedX = Math.max(
		CONTAINER_BOUNDS.x - shapeBounds.x,
		Math.min(shape.x, CONTAINER_BOUNDS.maxX - shapeBounds.x - shapeBounds.w)
	)
	const clampedY = Math.max(
		CONTAINER_BOUNDS.y - shapeBounds.y,
		Math.min(shape.y, CONTAINER_BOUNDS.maxY - shapeBounds.y - shapeBounds.h)
	)

	return {
		...shape,
		x: clampedX,
		y: clampedY,
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
						},
					})

					// Zoom to show the container area
					editor.zoomToBounds(new Box(0, 0, 600, 500), { animation: { duration: 0 } })
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
Clamp the shape's x and y coordinates so that the shape's bounds stay completely within
the container bounds. We account for the shape's geometry offset and dimensions.

[4]
Register a beforeChange handler that runs whenever any shape is about to be modified. We only
apply the constraint to geo shapes (rectangles). This handler intercepts changes and returns
a modified version of the shape with position clamped to the container.

[5]
Create a rectangle shape positioned inside our container bounds. Users can drag this shape,
but it will be prevented from leaving the container area.

[6]
Draw a dashed rectangle on the canvas to visualize the container bounds. This uses SVGContainer
to render directly on the canvas in world coordinates.
*/
