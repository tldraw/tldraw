import { Box, Editor, SVGContainer, TLShape, Tldraw, Vec, isShapeId } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

const RADIUS = 500

// [1]
function constrainShapeToRadius(editor: Editor, shape: TLShape, radius: number) {
	if (isShapeId(shape.parentId)) return shape

	const shapePoint = Vec.From(shape)
	const distanceFromCenter = shapePoint.len()

	if (distanceFromCenter > radius) {
		const newPoint = shapePoint.uni().mul(radius)
		return {
			...shape,
			x: newPoint.x,
			y: newPoint.y,
		}
	}

	return shape
}

export default function BeforeCreateUpdateShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					// [2]
					editor.sideEffects.registerBeforeCreateHandler('shape', (shape) => {
						return constrainShapeToRadius(editor, shape, RADIUS)
					})
					editor.sideEffects.registerBeforeChangeHandler('shape', (_prevShape, nextShape) => {
						return constrainShapeToRadius(editor, nextShape, RADIUS)
					})

					// [3]
					editor.zoomToBounds(new Box(-RADIUS, -RADIUS, RADIUS * 2, RADIUS * 2))
					editor.setCameraOptions({ isLocked: true })
				}}
				components={{
					OnTheCanvas: () => (
						<SVGContainer>
							<circle cx={0} cy={0} r={RADIUS} fill="none" stroke="black" />
						</SVGContainer>
					),
				}}
			/>
		</div>
	)
}

/*
[1]
Returns a copy of the shape whose x/y origin is within `radius` of the page origin, or the
same shape if it's already inside (or if it's parented to another shape rather than the page,
since a child's x/y are relative to its parent, not the page). Note that this constrains the
shape's origin, not its whole bounds, so shapes can still poke out past the circle.

[2]
Before-create and before-change handlers run before the record is written to the store, and
whatever they return is what gets written. That lets us adjust a shape on its way in instead
of reacting after the fact. Registering the same function for both means the constraint holds
for newly drawn shapes as well as shapes being dragged, resized, or pasted.

[3]
Lock the camera on the constrained area so it's obvious what's happening. The camera lock
isn't part of the side effect; it's just for the demo.
*/
