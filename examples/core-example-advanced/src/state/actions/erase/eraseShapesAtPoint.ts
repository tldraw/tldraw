import type { Action } from 'state/constants'
import type { TLPointerInfo } from '@tldraw/core'
import { getPagePoint } from 'state/helpers'
import { getShapeUtils } from 'shapes'
import { mutables } from 'state/mutables'

export const eraseShapesAtPoint: Action = (data, payload: TLPointerInfo) => {
  const { currentPoint } = mutables

  Object.values(data.page.shapes).forEach((shape) => {
    if (getShapeUtils(shape).hitTestPoint(shape, currentPoint)) {
      delete data.page.shapes[shape.id]
    }
  })
}
