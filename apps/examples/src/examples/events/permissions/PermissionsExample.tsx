import { Box, clamp, Editor, SVGContainer, TLGeoShape, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

const CONTAINER_BOUNDS = new Box(100, 100, 400, 300)

// [1]
function constrainShapeToBounds(editor: Editor, shape: TLGeoShape): TLGeoShape {
	const localBounds = editor.getShapeUtil(shape).getGeometry(shape).bounds
	const pageBounds = new Box(
		shape.x + localBounds.x,
		shape.y + localBounds.y,
		localBounds.w,
		localBounds.h
	)

	if (CONTAINER_BOUNDS.contains(pageBounds)) return shape

	// [2]
	return {
		...shape,
		x: clamp(shape.x, CONTAINER_BOUNDS.x - localBounds.x, CONTAINER_BOUNDS.maxX - localBounds.maxX),
		y: clamp(shape.y, CONTAINER_BOUNDS.y - localBounds.y, CONTAINER_BOUNDS.maxY - localBounds.maxY),
	}
}

export default function PermissionsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					// [3]
					editor.sideEffects.registerBeforeChangeHandler('shape', (_prevShape, nextShape) => {
						if (editor.isShapeOfType<TLGeoShape>(nextShape, 'geo')) {
							return constrainShapeToBounds(editor, nextShape)
						}
						return nextShape
					})

					editor.createShape<TLGeoShape>({
						type: 'geo',
						x: 250,
						y: 200,
						props: { geo: 'rectangle', w: 150, h: 100 },
					})

					editor.zoomToBounds(new Box(0, 0, 600, 500), { animation: { duration: 0 } })
				}}
				components={{
					// [4]
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
Work out where the *proposed* shape would sit on the page. Inside a before-change handler the
new shape isn't in the store yet, so cached lookups like `editor.getShapeGeometry(shape)` or
`editor.getShapePageBounds(shape)` would describe the old version. Calling the shape util's
`getGeometry` directly computes from the record we were given.

[2]
Clamp the shape's origin so its bounds stay inside the container. Geometry bounds are in the
shape's local space (for a geo shape they start at 0,0), so we offset by them.

[3]
Before-change handlers run for every shape update, whether it came from dragging, the arrow
keys, alignment actions, or `editor.updateShapes` in your own code. Returning a modified record
is what gets written, so the constraint holds regardless of how the change was made. We only
apply it to geo shapes here.

[4]
Draw the container as a dashed rectangle in page coordinates so it's easy to see. It's purely
visual and takes no part in the constraint.
*/
