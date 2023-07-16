import { Box2d, TLShape, Vec2d, Vec2dModel } from '@tldraw/editor'

export function resizeScaled(
	shape: Extract<TLShape, { props: { scale: number } }>,
	{
		initialBounds,
		scaleX,
		scaleY,
		newPoint,
	}: {
		newPoint: Vec2dModel
		initialBounds: Box2d
		scaleX: number
		scaleY: number
	}
) {
	// Compute the new scale (to apply to the scale prop)
	const scaleDelta = Math.max(0.01, Math.min(Math.abs(scaleX), Math.abs(scaleY)))

	// Compute the offset (if flipped X or flipped Y)
	const offset = new Vec2d(0, 0)

	if (scaleX < 0) {
		offset.x = -(initialBounds.width * scaleDelta)
	}
	if (scaleY < 0) {
		offset.y = -(initialBounds.height * scaleDelta)
	}

	// Apply the offset to the new point
	const { x, y } = Vec2d.Add(newPoint, offset.rot(shape.rotation))

	return {
		x,
		y,
		props: {
			scale: scaleDelta * shape.props.scale,
		},
	}
}
