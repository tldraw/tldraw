import { Utils } from '@tldraw/core'
import { intersectLineSegmentBounds } from '@tldraw/intersect'
import Vec from '@tldraw/vec'
import { Shape, getShapeUtils } from 'shapes'
import type { ArrowShape } from 'shapes/arrow'
import { AppData, BINDING_PADDING } from 'state/constants'

export function getBoundHandlePoint(
  data: AppData,
  fromShape: ArrowShape,
  toShape: Shape,
  handleId: keyof ArrowShape['handles']
) {
  const utils = getShapeUtils(toShape)
  const toShapeBounds = utils.getBounds(toShape)
  const toShapeCenter = utils.getCenter(toShape)

  // Get the point of the shape's opposite handle

  const oppositeHandleId = handleId === 'start' ? 'end' : 'start'
  const oppositeHandle = fromShape.handles[oppositeHandleId]
  const oppositeBinding = Object.values(data.page.bindings).find(
    (binding) => binding.fromId === fromShape.id && binding.handleId === oppositeHandleId
  )

  let oppositePoint: number[]

  if (oppositeBinding) {
    // If the other handle is also bound to a shape, use that other shape's center instead
    // of the handle's actual point
    const otherToShape = data.page.shapes[oppositeBinding.toId]

    if (!otherToShape) return

    oppositePoint = getShapeUtils(otherToShape).getCenter(otherToShape)
  } else {
    oppositePoint = Vec.add(fromShape.point, oppositeHandle.point)
  }

  // Find the intersection between the target shape's bounds and the two points as a line segment.

  const intersection =
    intersectLineSegmentBounds(
      oppositePoint,
      toShapeCenter,
      Utils.expandBounds(toShapeBounds, BINDING_PADDING)
    )[0]?.points[0] ?? toShapeCenter

  return intersection
}
