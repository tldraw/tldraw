import { TLPointerInfo, Utils } from '@tldraw/core'
import Vec from '@tldraw/vec'
import { nanoid } from 'nanoid'
import { Shape, getShapeUtils } from 'shapes'
import type { ArrowShape } from 'shapes/arrow'
import type { Action, CustomBinding } from 'state/constants'
import { mutables } from 'state/mutables'

export const translateHandle: Action = (data, payload: TLPointerInfo) => {
  const { initialPoint, snapshot, pointedHandleId } = mutables

  if (!pointedHandleId) return

  let delta = Vec.sub(mutables.currentPoint, initialPoint)

  data.pageState.selectedIds.forEach((id) => {
    const initialShape = snapshot.page.shapes[id] as ArrowShape

    const shape = data.page.shapes[id] as ArrowShape

    if (payload.shiftKey) {
      const A = initialShape.handles[pointedHandleId === 'start' ? 'end' : 'start'].point
      const B = initialShape.handles[pointedHandleId].point
      const C = Vec.add(B, delta)
      const angle = Vec.angle(A, C)
      const adjusted = Vec.rotWith(C, A, Utils.snapAngleToSegments(angle, 24) - angle)
      delta = Vec.add(delta, Vec.sub(adjusted, C))
    }

    const handlePoints = {
      start: [...initialShape.handles.start.point],
      end: [...initialShape.handles.end.point],
    }

    handlePoints[pointedHandleId] = Vec.add(handlePoints[pointedHandleId], delta)

    // Create binding

    const oppositeHandleId = pointedHandleId === 'start' ? 'end' : 'start'
    const oppositeHandle = shape.handles[oppositeHandleId]
    const handlePoint = Vec.add(handlePoints[pointedHandleId], initialShape.point)

    let minDistance = Infinity
    let toShape: Shape | undefined
    const oppositeBindingTargetId = Object.values(data.page.bindings).find(
      (binding) => binding.fromId === shape.id && binding.handleId === oppositeHandleId
    )?.toId

    if (!payload.metaKey) {
      // Find colliding shape with center nearest to point
      Object.values(data.page.shapes)
        .filter(
          (shape) =>
            !data.pageState.selectedIds.includes(shape.id) && shape.id !== oppositeBindingTargetId
        )
        .forEach((potentialTarget) => {
          const utils = getShapeUtils(potentialTarget)

          if (!utils.canBind) return

          const bounds = utils.getBounds(potentialTarget)

          if (Utils.pointInBounds(handlePoint, bounds)) {
            const dist = Vec.dist(handlePoint, utils.getCenter(potentialTarget))
            if (dist < minDistance) {
              minDistance = dist
              toShape = potentialTarget
            }
          }
        })
    }

    const oldBinding = Object.values(data.page.bindings).find(
      (binding) => binding.fromId === shape.id && binding.handleId === pointedHandleId
    )

    // If we have a binding target
    if (toShape) {
      if (!oldBinding || oldBinding.toId !== toShape.id) {
        if (oldBinding) {
          delete data.page.bindings[oldBinding.id]
        }

        // Create a new binding between shape and toShape
        const binding: CustomBinding = {
          id: nanoid(),
          fromId: shape.id,
          toId: toShape.id,
          handleId: pointedHandleId,
        }

        data.page.bindings[binding.id] = binding
      }

      // The `updateBoundShapes` action will take it from here.
      return
    }

    // If we didn't find a toShape, clear out the old binding (if present)
    if (oldBinding) {
      delete data.page.bindings[oldBinding.id]
    }

    const offset = Utils.getCommonTopLeft([handlePoints.start, handlePoints.end])
    shape.handles.start.point = Vec.sub(handlePoints.start, offset)
    shape.handles.end.point = Vec.sub(handlePoints.end, offset)
    shape.point = Vec.add(initialShape.point, offset)
  })
}
