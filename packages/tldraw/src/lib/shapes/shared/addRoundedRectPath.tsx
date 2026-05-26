import { Box } from '@tldraw/editor'

/**
 * Append a rounded rectangle subpath to a `Path2D`, sized to the given bounds. The corner radius
 * is clamped so it never exceeds half the bounds' width or height; passing `0` falls back to a
 * plain `path.rect()`.
 *
 * Pass `counterClockwise: true` when the subpath is being added to a path that will be used as a
 * clip or fill mask and you want this rectangle to punch a hole through an enclosing
 * clockwise shape (using the non-zero fill rule).
 *
 * @example
 * ```ts
 * const path = new Path2D()
 * addRoundedRectPath(path, bounds, 8)
 * ctx.fill(path)
 * ```
 *
 * @param path - The `Path2D` to append the subpath to.
 * @param bounds - The rectangle's position and size.
 * @param radius - The corner radius, in the same units as `bounds`.
 * @param counterClockwise - Draw the path counter-clockwise instead of clockwise. Defaults to `false`.
 *
 * @public
 */
export function addRoundedRectPath(
	path: Path2D,
	bounds: Box,
	radius: number,
	counterClockwise = false
) {
	const r = Math.max(0, Math.min(radius, bounds.w / 2, bounds.h / 2))

	if (r === 0) {
		path.rect(bounds.x, bounds.y, bounds.w, bounds.h)
		return
	}

	if (counterClockwise) {
		path.moveTo(bounds.x, bounds.y + r)
		path.lineTo(bounds.x, bounds.maxY - r)
		path.arcTo(bounds.x, bounds.maxY, bounds.x + r, bounds.maxY, r)
		path.lineTo(bounds.maxX - r, bounds.maxY)
		path.arcTo(bounds.maxX, bounds.maxY, bounds.maxX, bounds.maxY - r, r)
		path.lineTo(bounds.maxX, bounds.y + r)
		path.arcTo(bounds.maxX, bounds.y, bounds.maxX - r, bounds.y, r)
		path.lineTo(bounds.x + r, bounds.y)
		path.arcTo(bounds.x, bounds.y, bounds.x, bounds.y + r, r)
		path.closePath()
		return
	}

	path.moveTo(bounds.x + r, bounds.y)
	path.lineTo(bounds.maxX - r, bounds.y)
	path.arcTo(bounds.maxX, bounds.y, bounds.maxX, bounds.y + r, r)
	path.lineTo(bounds.maxX, bounds.maxY - r)
	path.arcTo(bounds.maxX, bounds.maxY, bounds.maxX - r, bounds.maxY, r)
	path.lineTo(bounds.x + r, bounds.maxY)
	path.arcTo(bounds.x, bounds.maxY, bounds.x, bounds.maxY - r, r)
	path.lineTo(bounds.x, bounds.y + r)
	path.arcTo(bounds.x, bounds.y, bounds.x + r, bounds.y, r)
	path.closePath()
}
