import { TLPointerInfo, Utils } from '@tldraw/core'
import { getShapeUtils } from 'shapes'
import type { Action } from 'state/constants'
import { mutables } from 'state/mutables'

export const updateBrush: Action = (data, payload: TLPointerInfo) => {
  const { initialPoint, snapshot } = mutables

  const brushBounds = Utils.getBoundsFromPoints([mutables.currentPoint, initialPoint])

  data.pageState.brush = brushBounds

  const initialSelectedIds = snapshot.pageState.selectedIds

  const hits = Object.values(snapshot.page.shapes)
    .filter((shape) =>
      payload.metaKey || payload.ctrlKey
        ? Utils.boundsContain(brushBounds, getShapeUtils(shape).getBounds(shape))
        : getShapeUtils(shape).hitTestBounds(shape, brushBounds)
    )
    .map((shape) => shape.id)

  data.pageState.selectedIds = payload.shiftKey
    ? Array.from(new Set([...initialSelectedIds, ...hits]).values())
    : hits
}
