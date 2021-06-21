import { Data, Edge, Corner } from 'types'
import vec from 'utils/vec'
import BaseSession from './base-session'
import commands from 'state/commands'
import { getShapeUtils } from 'state/shape-utils'
import {
  deepClone,
  getBoundsCenter,
  getBoundsFromPoints,
  getCommonBounds,
  getDocumentBranch,
  getPage,
  getRelativeTransformedBoundingBox,
  getSelectedIds,
  getTransformedBoundingBox,
  setToArray,
  updateParents,
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

  update(data: Data, point: number[], isAspectRatioLocked = false): void {
    const { transformType } = this

    const { shapeBounds, initialBounds, isAllAspectRatioLocked } = this.snapshot

    const { shapes } = getPage(data)

    const newBoundingBox = getTransformedBoundingBox(
      initialBounds,
      transformType,
      vec.vec(this.origin, point),
      data.boundsRotation,
      isAspectRatioLocked || isAllAspectRatioLocked
    )

    this.scaleX = newBoundingBox.scaleX
    this.scaleY = newBoundingBox.scaleY

    // Now work backward to calculate a new bounding box for each of the shapes.

    for (const id in shapeBounds) {
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

      shapes[id] = { ...shape }
    }

    updateParents(data, Object.keys(shapeBounds))
  }

  cancel(data: Data): void {
    const { currentPageId, shapeBounds } = this.snapshot

    const { shapes } = getPage(data, currentPageId)

    for (const id in shapeBounds) {
      const shape = shapes[id]

      const { initialShape, initialShapeBounds, transformOrigin } =
        shapeBounds[id]

      getShapeUtils(shape).transform(shape, initialShapeBounds, {
        type: this.transformType,
        initialShape,
        scaleX: 1,
        scaleY: 1,
        transformOrigin,
      })

      updateParents(data, Object.keys(shapeBounds))
    }
  }

  complete(data: Data): void {
    const { initialShapes, hasUnlockedShapes } = this.snapshot

    if (!hasUnlockedShapes) return

    const page = getPage(data)

    const finalShapes = initialShapes.map((shape) =>
      deepClone(page.shapes[shape.id])
    )

    commands.mutate(data, initialShapes, finalShapes)
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getTransformSnapshot(data: Data, transformType: Edge | Corner) {
  const { currentPageId } = data
  const page = getPage(data)

  const initialShapes = setToArray(getSelectedIds(data))
    .flatMap((id) => getDocumentBranch(data, id).map((id) => page.shapes[id]))
    .filter((shape) => !shape.isLocked)
    .map((shape) => deepClone(shape))

  const hasUnlockedShapes = initialShapes.length > 0

  const isAllAspectRatioLocked = initialShapes.every(
    (shape) =>
      shape.isAspectRatioLocked || !getShapeUtils(shape).canChangeAspectRatio
  )

  const shapesBounds = Object.fromEntries(
    initialShapes.map((shape) => [
      shape.id,
      getShapeUtils(shape).getBounds(shape),
    ])
  )

  const boundsArr = Object.values(shapesBounds)

  const commonBounds = getCommonBounds(...boundsArr)

  const initialInnerBounds = getBoundsFromPoints(boundsArr.map(getBoundsCenter))

  // Return a mapping of shapes to bounds together with the relative
  // positions of the shape's bounds within the common bounds shape.
  return {
    type: transformType,
    hasUnlockedShapes,
    isAllAspectRatioLocked,
    currentPageId,
    initialShapes,
    initialBounds: commonBounds,
    shapeBounds: Object.fromEntries(
      initialShapes.map((shape) => {
        const initialShapeBounds = shapesBounds[shape.id]
        const ic = getBoundsCenter(initialShapeBounds)

        const ix = (ic[0] - initialInnerBounds.minX) / initialInnerBounds.width
        const iy = (ic[1] - initialInnerBounds.minY) / initialInnerBounds.height

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

// function resizeDescendants(data: Data, shapeId: string, bounds: Bounds) {

//   const { initialShape, initialShapeBounds, transformOrigin } =
//     shapeBounds[id]

//   const newShapeBounds = getRelativeTransformedBoundingBox(
//     newBoundingBox,
//     initialBounds,
//     initialShapeBounds,
//     this.scaleX < 0,
//     this.scaleY < 0
//   )

//   const shape = shapes[id]

//   getShapeUtils(shape).transform(shape, newShapeBounds, {
//     type: this.transformType,
//     initialShape,
//     scaleX: this.scaleX,
//     scaleY: this.scaleY,
//     transformOrigin,
//   })
// }
