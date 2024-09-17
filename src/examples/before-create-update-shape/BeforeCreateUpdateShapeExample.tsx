import { Box, Editor, SVGContainer, TLShape, Tldraw, Vec, isShapeId } from 'tldraw'

// This function takes a shape and returns a new shape where the x/y origin is within `radius`
// distance of the center of the page. If the shape is already within `radius` (or isn't parented to
// the page) it returns the same shape.
function constrainShapeToRadius(editor: Editor, shape: TLShape, radius: number) {
	// if the shape is parented to another shape (instead of the page) leave it as-is
	if (isShapeId(shape.parentId)) return shape

	// get the position of the shape
	const shapePoint = Vec.From(shape)
	const distanceFromCenter = shapePoint.len()

	// if the shape is outside the radius, move it to the edge of the radius:
	if (distanceFromCenter > radius) {
		const newPoint = shapePoint.norm().mul(radius)
		return {
			...shape,
			x: newPoint.x,
			y: newPoint.y,
		}
	}

	// otherwise, leave the shape as-is
	return shape
}

export default function BeforeCreateUpdateShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					// we can run our `constrainShapeToRadius` function before any shape is created
					// or changed. These `sideEffects` handlers let us take modify the shape that
					// will be created or updated by returning a new one to be used in its place.
					editor.sideEffects.registerBeforeCreateHandler('shape', (shape) => {
						return constrainShapeToRadius(editor, shape, 500)
					})
					editor.sideEffects.registerBeforeChangeHandler('shape', (prevShape, nextShape) => {
						return constrainShapeToRadius(editor, nextShape, 500)
					})

					// center the camera on the area we're constraining shapes to
					editor.zoomToBounds(new Box(-500, -500, 1000, 1000))

					// lock the camera on that area
					editor.setCameraOptions({ isLocked: true })
				}}
				components={{
					// to make it a little clearer what's going on in this example, we'll draw a
					// circle on the canvas showing where shapes are being constrained to.
					OnTheCanvas: () => (
						<SVGContainer>
							<circle cx={0} cy={0} r={500} fill="none" stroke="black" />
						</SVGContainer>
					),
				}}
			/>
		</div>
	)
}
