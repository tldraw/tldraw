import type { TLPointerInfo } from '@tldraw/core'
import { shapeUtils } from 'shapes'
import type { Action } from 'state/constants'
import { mutables } from 'state/mutables'

export const createPencilShape: Action = (data, payload: TLPointerInfo) => {
  const shape = shapeUtils.pencil.getShape({
    parentId: 'page1',
    point: mutables.currentPoint,
    points: [[0, 0]],
    childIndex: Object.values(data.page.shapes).length,
  })

  data.page.shapes[shape.id] = shape
  data.pageState.selectedIds = [shape.id]

  mutables.rawPoints = [[0, 0]]
  mutables.pointedShapeId = shape.id
}
