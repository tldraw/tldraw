import type { TLPointerInfo } from '@tldraw/core'
import { getShapeUtils } from 'shapes'
import type { Action } from 'state/constants'
import { mutables } from 'state/mutables'

export const eraseShapes: Action = (data, payload: TLPointerInfo) => {
  const { previousPoint } = mutables

  Object.values(data.page.shapes)
    .filter((shape) => !shape.isGhost)
    .forEach((shape) => {
      if (getShapeUtils(shape).hitTestLineSegment(shape, previousPoint, mutables.currentPoint)) {
        shape.isGhost = true
      }
    })
}
