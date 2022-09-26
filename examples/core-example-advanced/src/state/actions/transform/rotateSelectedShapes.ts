import { TLPointerInfo, Utils } from '@tldraw/core'
import Vec from '@tldraw/vec'
import { getShapeUtils } from 'shapes'
import type { ArrowShape } from 'shapes/arrow'
import type { Action } from 'state/constants'
import { mutables } from 'state/mutables'

export const rotateSelectedShapes: Action = (data, payload: TLPointerInfo) => {
  const { initialPoint, snapshot } = mutables
  const { selectedIds } = data.pageState

  const initialCommonCenter = Utils.getBoundsCenter(
    Utils.getCommonBounds(
      selectedIds
        .map((id) => snapshot.page.shapes[id])
        .map((shape) => getShapeUtils(shape).getBounds(shape))
    )
  )

  const initialAngle = Vec.angle(initialCommonCenter, initialPoint)
  const currentAngle = Vec.angle(initialCommonCenter, mutables.currentPoint)

  let angleDelta = currentAngle - initialAngle

  if (payload.shiftKey) {
    angleDelta = Utils.snapAngleToSegments(angleDelta, 24)
  }

  selectedIds.forEach((id) => {
    const initialShape = snapshot.page.shapes[id]

    let initialAngle = 0

    if (payload.shiftKey) {
      const { rotation = 0 } = initialShape
      initialAngle = Utils.snapAngleToSegments(rotation, 24) - rotation
    }

    const shape = data.page.shapes[id]
    const utils = getShapeUtils(initialShape)

    const initialShapeCenter = utils.getCenter(initialShape)
    const relativeCenter = Vec.sub(initialShapeCenter, initialShape.point)
    const rotatedCenter = Vec.rotWith(initialShapeCenter, initialCommonCenter, angleDelta)

    if (shape.handles) {
      // Don't rotate shapes with handles; instead, rotate the handles
      Object.values(shape.handles).forEach((handle) => {
        handle.point = Vec.rotWith(
          initialShape.handles![handle.id as keyof ArrowShape['handles']].point,
          relativeCenter,
          angleDelta
        )
      })

      const handlePoints = {
        start: [...shape.handles.start.point],
        end: [...shape.handles.end.point],
      }

      const offset = Utils.getCommonTopLeft([handlePoints.start, handlePoints.end])

      shape.handles.start.point = Vec.sub(handlePoints.start, offset)
      shape.handles.end.point = Vec.sub(handlePoints.end, offset)
      shape.point = Vec.add(Vec.sub(rotatedCenter, relativeCenter), offset)
    } else {
      shape.point = Vec.sub(rotatedCenter, relativeCenter)
      shape.rotation = (initialShape.rotation || 0) + angleDelta + initialAngle
    }
  })
}
