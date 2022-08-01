import { TLPointerInfo, Utils } from '@tldraw/core'
import Vec from '@tldraw/vec'
import type { Action } from 'state/constants'
import { mutables } from 'state/mutables'

export const extendPencilShape: Action = (data, payload: TLPointerInfo) => {
  const { initialPoint, previousPoint, rawPoints, pointedShapeId } = mutables

  if (Vec.isEqual(previousPoint, mutables.currentPoint)) return

  const shape = data.page.shapes[pointedShapeId!]

  if (!shape || shape.type !== 'pencil') {
    throw Error('We should have a selected pencil shape.')
  }

  // The point relative to the initial point
  const relativePoint = Vec.sub(mutables.currentPoint, initialPoint)

  // The raw points array holds the relative points
  rawPoints.push(relativePoint)

  // If the shapes points go left or above the initial point,
  // we need to move the shape to that top left corner and
  // move the points so that they appear to stay in the same place.
  const offset = Utils.getCommonTopLeft(rawPoints)
  shape.point = Vec.add(initialPoint, offset)
  shape.points = rawPoints.map((point) => Vec.sub(point, offset))
}
