import { TLBaseShape } from '@tldraw/tlschema'
import { exhaustiveSwitchError } from '@tldraw/utils'
import { Vec } from '../../../primitives/Vec'
import { TLResizeInfo } from '../ShapeUtil'

/**
 * Resize a shape that has a scale prop.
 *
 * @param shape - The shape to resize
 * @param info - The resize info
 *
 * @public */
export function resizeScaled(
	shape: TLBaseShape<any, { scale: number }>,
	{ initialBounds, scaleX, scaleY, newPoint, handle }: TLResizeInfo<any>
) {
	let scaleDelta: number
	switch (handle) {
		case 'bottom_left':
		case 'bottom_right':
		case 'top_left':
		case 'top_right': {
			scaleDelta = Math.max(0.01, Math.max(Math.abs(scaleX), Math.abs(scaleY)))
			break
		}
		case 'left':
		case 'right': {
			scaleDelta = Math.max(0.01, Math.abs(scaleX))
			break
		}
		case 'bottom':
		case 'top': {
			scaleDelta = Math.max(0.01, Math.abs(scaleY))
			break
		}
		default: {
			throw exhaustiveSwitchError(handle)
		}
	}

	// Compute the offset (if flipped X or flipped Y)
	const offset = new Vec(0, 0)

	if (scaleX < 0) {
		offset.x = -(initialBounds.width * scaleDelta)
	}
	if (scaleY < 0) {
		offset.y = -(initialBounds.height * scaleDelta)
	}

	// Apply the offset to the new point
	const { x, y } = Vec.Add(newPoint, offset.rot(shape.rotation))

	return {
		x,
		y,
		props: {
			scale: scaleDelta * shape.props.scale,
		},
	}
}
