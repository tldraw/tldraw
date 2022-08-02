import { TLBoundsCorner, TLPointerInfo } from '@tldraw/core'
import { shapeUtils } from 'shapes'
import type { Action } from 'state/constants'
import { mutables } from 'state/mutables'

export const createBoxShape: Action = (data, payload: TLPointerInfo) => {
  const shape = shapeUtils.box.getShape({
    parentId: 'page1',
    point: mutables.currentPoint,
    size: [1, 1],
    childIndex: Object.values(data.page.shapes).length,
  })

  data.page.shapes[shape.id] = shape
  data.pageState.selectedIds = [shape.id]

  mutables.pointedBoundsHandleId = TLBoundsCorner.BottomRight
}
