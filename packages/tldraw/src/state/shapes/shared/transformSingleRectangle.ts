import type { TLBounds, TLShape } from '@tldraw/core'
import Vec from '@tldraw/vec'

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
