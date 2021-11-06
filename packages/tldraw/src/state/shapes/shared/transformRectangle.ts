import type { TLBounds, TLShape, TLTransformInfo } from '@tldraw/core'
import Vec from '@tldraw/vec'

/**
 * Transform a rectangular shape.
 * @param shape
 * @param bounds
 * @param param2
 */
export function transformRectangle<T extends TLShape & { size: number[] }>(
  shape: T,
  bounds: TLBounds,
  { initialShape, transformOrigin, scaleX, scaleY }: TLTransformInfo<T>
) {
  if (shape.rotation || initialShape.isAspectRatioLocked) {
    const size = Vec.round(Vec.mul(initialShape.size, Math.min(Math.abs(scaleX), Math.abs(scaleY))))

    const point = Vec.round([
      bounds.minX +
        (bounds.width - shape.size[0]) * (scaleX < 0 ? 1 - transformOrigin[0] : transformOrigin[0]),
      bounds.minY +
        (bounds.height - shape.size[1]) *
          (scaleY < 0 ? 1 - transformOrigin[1] : transformOrigin[1]),
    ])

    const rotation =
      (scaleX < 0 && scaleY >= 0) || (scaleY < 0 && scaleX >= 0)
        ? initialShape.rotation
          ? -initialShape.rotation
          : 0
        : initialShape.rotation

    return {
      size,
      point,
      rotation,
    }
  } else {
    return {
      point: Vec.round([bounds.minX, bounds.minY]),
      size: Vec.round([bounds.width, bounds.height]),
    }
  }
}
