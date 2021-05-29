import { Data, Edge, Corner } from 'types'
import * as vec from 'utils/vec'
import BaseSession from './base-session'
import commands from 'state/commands'
import { current } from 'immer'
import { getShapeUtils } from 'lib/shape-utils'
import {
  getBoundsCenter,
  getBoundsFromPoints,
  getCommonBounds,
  getPage,
  getRelativeTransformedBoundingBox,
  getSelectedShapes,
  getShapes,
  getTransformedBoundingBox,
} from 'utils/utils'

export default class TransformSession extends BaseSession {
  scaleX = 1
  scaleY = 1
  transformType: Edge | Corner
  origin: number[]
  snapshot: TransformSnapshot

  constructor(data: Data, transformType: Corner | Edge, point: number[]) {
    super(data)
    this.origin = point
    this.transformType = transformType
    this.snapshot = getTransformSnapshot(data, transformType)
  }

  update(data: Data, point: number[], isAspectRatioLocked = false) {
    const { transformType } = this

    const { shapeBounds, initialBounds } = this.snapshot

    const { shapes } = getPage(data)

    const newBoundingBox = getTransformedBoundingBox(
      initialBounds,
      transformType,
      vec.vec(this.origin, point),
      data.boundsRotation,
      isAspectRatioLocked
    )

    this.scaleX = newBoundingBox.scaleX
    this.scaleY = newBoundingBox.scaleY

    // Now work backward to calculate a new bounding box for each of the shapes.

    for (let id in shapeBounds) {
      const { initialShape, initialShapeBounds, transformOrigin } =
        shapeBounds[id]

      const newShapeBounds = getRelativeTransformedBoundingBox(
        newBoundingBox,
        initialBounds,
        initialShapeBounds,
        this.scaleX < 0,
        this.scaleY < 0
      )

      const shape = shapes[id]

      getShapeUtils(shape).transform(shape, newShapeBounds, {
        type: this.transformType,
        initialShape,
        scaleX: this.scaleX,
        scaleY: this.scaleY,
        transformOrigin,
      })
    }
  }

  cancel(data: Data) {
    const { currentPageId, shapeBounds } = this.snapshot

    const page = getPage(data, currentPageId)

    for (let id in shapeBounds) {
      const shape = page.shapes[id]

      const { initialShape, initialShapeBounds, transformOrigin } =
        shapeBounds[id]

      getShapeUtils(shape).transform(shape, initialShapeBounds, {
        type: this.transformType,
        initialShape,
        scaleX: 1,
        scaleY: 1,
        transformOrigin,
      })
    }
  }

  complete(data: Data) {
    commands.transform(
      data,
      this.snapshot,
      getTransformSnapshot(data, this.transformType)
    )
  }
}

export function getTransformSnapshot(data: Data, transformType: Edge | Corner) {
  const cData = current(data)
  const { currentPageId } = cData

  const initialShapes = getSelectedShapes(cData).filter(
    (shape) => !shape.isLocked
  )
  const hasShapes = initialShapes.length > 0

  // A mapping of selected shapes and their bounds
  const shapesBounds = Object.fromEntries(
    initialShapes.map((shape) => [
      shape.id,
      getShapeUtils(shape).getBounds(shape),
    ])
  )

  const boundsArr = Object.values(shapesBounds)

  // The common (exterior) bounds of the selected shapes
  const bounds = getCommonBounds(...boundsArr)

  const initialInnerBounds = getBoundsFromPoints(boundsArr.map(getBoundsCenter))

  // Return a mapping of shapes to bounds together with the relative
  // positions of the shape's bounds within the common bounds shape.
  return {
    type: transformType,
    hasShapes,
    currentPageId,
    initialBounds: bounds,
    shapeBounds: Object.fromEntries(
      initialShapes.map((shape) => {
        const initialShapeBounds = shapesBounds[shape.id]
        const ic = getBoundsCenter(initialShapeBounds)

        let ix = (ic[0] - initialInnerBounds.minX) / initialInnerBounds.width
        let iy = (ic[1] - initialInnerBounds.minY) / initialInnerBounds.height

        return [
          shape.id,
          {
            initialShape: shape,
            initialShapeBounds,
            transformOrigin: [ix, iy],
          },
        ]
      })
    ),
  }
}

export type TransformSnapshot = ReturnType<typeof getTransformSnapshot>

// const transformOrigins = {
//   [Edge.Top]: [0.5, 1],
//   [Edge.Right]: [0, 0.5],
//   [Edge.Bottom]: [0.5, 0],
//   [Edge.Left]: [1, 0.5],
//   [Corner.TopLeft]: [1, 1],
//   [Corner.TopRight]: [0, 1],
//   [Corner.BottomLeft]: [1, 0],
//   [Corner.BottomRight]: [0, 0],
// }

// const origin = transformOrigins[this.transformType]
