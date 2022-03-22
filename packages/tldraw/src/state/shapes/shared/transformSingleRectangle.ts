import type { TLBounds, TLShape } from '@tlslides/core'
import Vec from '@tlslides/vec'

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
    size: Vec.toFixed([bounds.width, bounds.height]),
    point: Vec.toFixed([bounds.minX, bounds.minY]),
  }
}
