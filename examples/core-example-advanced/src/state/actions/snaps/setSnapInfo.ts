import { TLBoundsWithCenter, TLPointerInfo, Utils } from '@tldraw/core'
import { getShapeUtils } from 'shapes'
import type { Action } from 'state/constants'
import { mutables } from 'state/mutables'

export const setSnapInfo: Action = (data, payload: TLPointerInfo) => {
  const all: TLBoundsWithCenter[] = []
  const others: TLBoundsWithCenter[] = []

  Object.values(data.page.shapes).forEach((shape) => {
    const bounds = Utils.getBoundsWithCenter(getShapeUtils(shape).getRotatedBounds(shape))
    all.push(bounds)
    if (!(data.pageState.selectedIds.includes(shape.id) || shape.type === 'arrow')) {
      others.push(bounds)
    }
  })

  const initialBounds = Utils.getBoundsWithCenter(
    Utils.getCommonBounds(
      data.pageState.selectedIds
        .map((id) => data.page.shapes[id])
        .map((shape) => getShapeUtils(shape).getBounds(shape))
    )
  )

  mutables.snapInfo = {
    initialBounds,
    all,
    others,
  }
}
