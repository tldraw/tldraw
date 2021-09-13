import { Vec } from '@tldraw/vec'
import { TLBounds, TLShape, TLTransformInfo, Utils } from '@tldraw/core'

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

/**
 * Transform a single rectangular shape.
 * @param shape
 * @param bounds
 */
export function transformSingleRectangle<T extends TLShape & { size: number[] }>(
  shape: T,
  bounds: TLBounds
) {
  return {
    size: Vec.round([bounds.width, bounds.height]),
    point: Vec.round([bounds.minX, bounds.minY]),
  }
}

/**
 * Find the bounds of a rectangular shape.
 * @param shape
 * @param boundsCache
 */
export function getBoundsRectangle<T extends TLShape & { size: number[] }>(
  shape: T,
  boundsCache: WeakMap<T, TLBounds>
) {
  const bounds = Utils.getFromCache(boundsCache, shape, () => {
    const [width, height] = shape.size
    return {
      minX: 0,
      maxX: width,
      minY: 0,
      maxY: height,
      width,
      height,
    }
  })

  return Utils.translateBounds(bounds, shape.point)
}
