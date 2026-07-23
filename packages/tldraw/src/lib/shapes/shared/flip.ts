import { MatModel } from '@tldraw/editor'

/**
 * The flip state shared by shapes that model mirroring with `flipX` / `flipY` props (for example
 * the image and geo shapes).
 *
 * @internal
 */
export interface ShapeFlipState {
	/** Whether the shape is mirrored horizontally. */
	flipX: boolean
	/** Whether the shape is mirrored vertically. */
	flipY: boolean
}

/**
 * Compute the new `flipX` / `flipY` state after a resize. An axis is toggled whenever its resize
 * scale goes negative, which happens both when using the flip command (scale of exactly `-1`) and
 * when dragging a resize handle (including a group's handle) past the opposite edge. We can't check
 * for an exact scale of `-1` because a group flip resizes its children by an arbitrary negative
 * scale, not just `-1`.
 *
 * @param initial - The flip state of the shape before the resize.
 * @param info - The resize scale factors for each axis.
 * @returns The flip state to apply to the resized shape.
 * @internal
 */
export function getFlipForResize(
	initial: ShapeFlipState,
	info: { scaleX: number; scaleY: number }
): ShapeFlipState {
	return {
		flipX: info.scaleX < 0 !== initial.flipX,
		flipY: info.scaleY < 0 !== initial.flipY,
	}
}

/**
 * Get an affine matrix that mirrors a `width`×`height` box around its center according to the given
 * flip state. Flipping the geometry with this matrix reproduces the visual result of `scale(-1)`
 * around the center, without needing negative width/height.
 *
 * @param flip - The flip state to apply.
 * @param width - The width of the box to mirror within.
 * @param height - The height of the box to mirror within.
 * @returns An affine matrix mirroring points within the box.
 * @internal
 */
export function getFlipMatrix(flip: ShapeFlipState, width: number, height: number): MatModel {
	return {
		a: flip.flipX ? -1 : 1,
		b: 0,
		c: 0,
		d: flip.flipY ? -1 : 1,
		// mirroring around the center of the box: x' = width - x, y' = height - y
		e: flip.flipX ? width : 0,
		f: flip.flipY ? height : 0,
	}
}
