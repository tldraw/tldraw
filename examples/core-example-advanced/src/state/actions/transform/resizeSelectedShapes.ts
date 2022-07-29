import { TLBoundsCorner, TLBoundsEdge, TLPointerInfo, Utils } from '@tldraw/core'
import Vec from '@tldraw/vec'
import { getShapeUtils } from 'shapes'
import type { Action } from 'state/constants'
import { mutables } from 'state/mutables'

export const resizeSelectedShapes: Action = (data, payload: TLPointerInfo) => {
  const { pointedBoundsHandleId, initialPoint, snapshot } = mutables
  const { selectedIds } = data.pageState

  const initialCommonBounds = Utils.getCommonBounds(
    selectedIds
      .map((id) => snapshot.page.shapes[id])
      .map((shape) => getShapeUtils(shape).getBounds(shape))
  )

  let rotation = 0
  const delta = Vec.sub(mutables.currentPoint, initialPoint)

  if (selectedIds.length === 1) {
    rotation = snapshot.page.shapes[selectedIds[0]].rotation || 0
  }

  const nextCommonBounds = Utils.getTransformedBoundingBox(
    initialCommonBounds,
    pointedBoundsHandleId as TLBoundsCorner | TLBoundsEdge,
    delta,
    rotation,
    payload.shiftKey
  )

  const { scaleX, scaleY } = nextCommonBounds

  selectedIds.forEach((id) => {
    const initialShape = snapshot.page.shapes[id]
    const shape = data.page.shapes[id]

    const relativeBoundingBox = Utils.getRelativeTransformedBoundingBox(
      nextCommonBounds,
      initialCommonBounds,
      getShapeUtils(initialShape).getBounds(initialShape),
      scaleX < 0,
      scaleY < 0
    )

    getShapeUtils(shape).transform(shape, relativeBoundingBox, initialShape, [scaleX, scaleY])
  })
}
