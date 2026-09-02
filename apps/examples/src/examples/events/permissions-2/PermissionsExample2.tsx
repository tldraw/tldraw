import { Box, clamp, Editor, SVGContainer, TLGeoShape, Tldraw, toRichText } from 'tldraw'
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
	const w = Math.min(shape.props.w, CONTAINER_BOUNDS.w)
	const h = Math.min(shape.props.h, CONTAINER_BOUNDS.h)

	return {
		...shape,
		x: clamp(shape.x, CONTAINER_BOUNDS.x, CONTAINER_BOUNDS.maxX - w),
		y: clamp(shape.y, CONTAINER_BOUNDS.y, CONTAINER_BOUNDS.maxY - h),
		props: { ...shape.props, w, h },
	}
}

export default function PermissionsExample2() {
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
						props: {
							geo: 'rectangle',
							w: 150,
							h: 100,
							richText: toRichText('Try to drag or resize me'),
						},
					})

					editor.zoomToBounds(new Box(0, 0, 600, 500), { animation: { duration: 0 } })
				}}
				components={{
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
This builds on the permissions example, which only clamps position. Here a resize that would
push the shape past the container is clamped too.

[1]
Inside a before-change handler the new shape isn't in the store yet, so cached lookups like
`editor.getShapeGeometry(shape)` or `editor.getShapePageBounds(shape)` describe the *old*
version, which is exactly wrong when the change is a resize. Calling the shape util's
`getGeometry` directly computes bounds from the record we were given.

[2]
Clamp the size to the container first, then clamp the origin so the (possibly shrunk) shape
fits. This uses `props.w`/`props.h` directly, which is fine for an unrotated rectangle whose
geometry starts at its origin. A general solution would clamp the rotated page bounds instead.

[3]
Because the constraint runs at the store level, it applies however the change was made:
dragging, resize handles, arrow keys, alignment actions, or `editor.updateShapes` from your own
code. We only apply it to geo shapes here.
*/
