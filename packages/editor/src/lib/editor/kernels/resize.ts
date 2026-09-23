import { Box } from '../../primitives/Box'
import { Mat, MatLike } from '../../primitives/Mat'
import { approximately } from '../../primitives/utils'
import { Vec, VecLike } from '../../primitives/Vec'

// Pure resize math. Resizing is a conversation with the shape's util (`onResizeStart`, `onResize`,
// `onResizeEnd`), and the util may read or change editor state between those calls, so the
// choreography stays in Editor. Only the transforms live here, and nothing in this file may read
// editor state.

/**
 * Replace a non-finite scale factor with 1. A zero-width or zero-height initial bounds divides
 * through to Infinity or NaN, which would otherwise propagate into the shape's position.
 */
export function getFiniteScale(scale: VecLike): VecLike {
	if (!Number.isFinite(scale.x)) scale = new Vec(1, scale.y)
	if (!Number.isFinite(scale.y)) scale = new Vec(scale.x, 1)
	return scale
}

/** Lock a scale's aspect ratio to the axis being scaled the most. */
export function lockScaleToLargerAxis(scale: VecLike): Vec {
	if (Math.abs(scale.x) > Math.abs(scale.y)) {
		return new Vec(scale.x, Math.sign(scale.y) * Math.abs(scale.x))
	}
	return new Vec(Math.sign(scale.x) * Math.abs(scale.y), scale.y)
}

/**
 * Lock a scale's aspect ratio to the axis being scaled the least, which keeps a shape from growing
 * beyond the bounds of the selection.
 */
export function lockScaleToSmallerAxis(scale: VecLike): Vec {
	const shapeScale = new Vec(scale.x, scale.y)
	if (Math.abs(scale.x) > Math.abs(scale.y)) {
		shapeScale.x = Math.sign(scale.x) * Math.abs(scale.y)
	} else {
		shapeScale.y = Math.sign(scale.y) * Math.abs(scale.x)
	}
	return shapeScale
}

/** Scale a point in page space about a scale origin, along the scale axis. */
export function scalePagePoint(
	point: VecLike,
	scaleOrigin: VecLike,
	scale: VecLike,
	scaleAxisRotation: number
): Vec {
	const relativePoint = Vec.RotWith(point, scaleOrigin, -scaleAxisRotation).sub(scaleOrigin)

	// calculate the new point position relative to the scale origin
	const newRelativePagePoint = Vec.MulV(relativePoint, scale)

	// and rotate it back to page coords to get the new page point of the resized shape
	const destination = Vec.Add(newRelativePagePoint, scaleOrigin).rotWith(
		scaleOrigin,
		scaleAxisRotation
	)

	return destination
}

/**
 * The scale to hand to the shape util, in the shape's own axes. The shape is aligned with the rest
 * of the shapes in the selection, but may be 90deg offset from the main rotation of the selection,
 * in which case we need to flip the width and height scale factors.
 */
export function getLocalScale(
	scale: VecLike,
	pageRotation: number,
	scaleAxisRotation: number
): Vec {
	const areWidthAndHeightAlignedWithCorrectAxis = approximately(
		(pageRotation - scaleAxisRotation) % Math.PI,
		0
	)
	return new Vec(
		areWidthAndHeightAlignedWithCorrectAxis ? scale.x : scale.y,
		areWidthAndHeightAlignedWithCorrectAxis ? scale.y : scale.x
	)
}

/** Whether a scale mirrors one axis but not the other, which a scale alone cannot express. */
export function isMirroredInOneAxis(scale: VecLike): boolean {
	return Math.sign(scale.x) * Math.sign(scale.y) < 0
}

/**
 * The local rotation that negates a shape's page rotation, which mirrors it.
 *
 * For a shape with local rotation `localRotation` and parent page rotation `parentRotation`:
 * - pageRot = parentRot + localRot
 * - newPageRot = -pageRot (we want to negate the page rotation)
 * - newPageRot = parentRot + newLocalRot (parent hasn't changed)
 * - Therefore: newLocalRot = -pageRot - parentRot = -(parentRot + localRot) - parentRot = -localRot - 2*parentRot
 */
export function getMirroredRotation(localRotation: number, parentRotation: number): number {
	return -localRotation - 2 * parentRotation
}

/**
 * The page point that puts a shape's center at `targetPageCenter`.
 *
 * This uses the local bounds center transformed to page space, not the axis-aligned page bounds
 * center. The page bounds are axis-aligned and their center changes when the rotation changes,
 * while the target center is measured from the same local reference point.
 */
export function getPagePointForCenter(
	pageTransform: MatLike,
	localBounds: Box,
	targetPageCenter: VecLike
): Vec {
	const currentPageCenter = Mat.applyToPoint(pageTransform, localBounds.center)
	const shapePageTransformOrigin = Mat.Point(pageTransform)
	const pageDelta = Vec.Sub(targetPageCenter, currentPageCenter)
	return Vec.Add(shapePageTransformOrigin, pageDelta)
}
