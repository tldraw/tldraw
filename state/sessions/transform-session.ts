import { Data, TransformEdge, TransformCorner } from "types"
import * as vec from "utils/vec"
import BaseSession from "./base-session"
import commands from "state/commands"
import { current } from "immer"
import { getShapeUtils } from "lib/shape-utils"
import {
  getCommonBounds,
  getRelativeTransformedBoundingBox,
  getTransformedBoundingBox,
} from "utils/utils"

export default class TransformSession extends BaseSession {
  scaleX = 1
  scaleY = 1
  transformType: TransformEdge | TransformCorner
  origin: number[]
  snapshot: TransformSnapshot

  constructor(
    data: Data,
    transformType: TransformCorner | TransformEdge,
    point: number[]
  ) {
    super(data)
    this.origin = point
    this.transformType = transformType
    this.snapshot = getTransformSnapshot(data, transformType)
  }

  update(data: Data, point: number[]) {
    const { transformType } = this

    const { currentPageId, selectedIds, shapeBounds, initialBounds } =
      this.snapshot

    const newBoundingBox = getTransformedBoundingBox(
      initialBounds,
      transformType,
      vec.vec(this.origin, point),
      data.boundsRotation
    )

    this.scaleX = newBoundingBox.scaleX
    this.scaleY = newBoundingBox.scaleY

    // Now work backward to calculate a new bounding box for each of the shapes.

    selectedIds.forEach((id) => {
      const { initialShape, initialShapeBounds } = shapeBounds[id]

      const newShapeBounds = getRelativeTransformedBoundingBox(
        newBoundingBox,
        initialBounds,
        initialShapeBounds,
        this.scaleX < 0,
        this.scaleY < 0
      )

      const shape = data.document.pages[currentPageId].shapes[id]

      getShapeUtils(shape).transform(shape, newShapeBounds, {
        type: this.transformType,
        initialShape,
        scaleX: this.scaleX,
        scaleY: this.scaleY,
      })
    })
  }

  cancel(data: Data) {
    const { currentPageId, selectedIds, shapeBounds } = this.snapshot

    selectedIds.forEach((id) => {
      const shape = data.document.pages[currentPageId].shapes[id]

      const { initialShape, initialShapeBounds } = shapeBounds[id]

      getShapeUtils(shape).transform(shape, initialShapeBounds, {
        type: this.transformType,
        initialShape,
        scaleX: 1,
        scaleY: 1,
      })
    })
  }

  complete(data: Data) {
    commands.transform(
      data,
      this.snapshot,
      getTransformSnapshot(data, this.transformType),
      this.scaleX,
      this.scaleY
    )
  }
}

export function getTransformSnapshot(
  data: Data,
  transformType: TransformEdge | TransformCorner
) {
  const {
    document: { pages },
    selectedIds,
    currentPageId,
  } = current(data)

  const pageShapes = pages[currentPageId].shapes

  // A mapping of selected shapes and their bounds
  const shapesBounds = Object.fromEntries(
    Array.from(selectedIds.values()).map((id) => {
      const shape = pageShapes[id]
      return [shape.id, getShapeUtils(shape).getBounds(shape)]
    })
  )

  // The common (exterior) bounds of the selected shapes
  const bounds = getCommonBounds(...Object.values(shapesBounds))

  // Return a mapping of shapes to bounds together with the relative
  // positions of the shape's bounds within the common bounds shape.
  return {
    type: transformType,
    currentPageId,
    selectedIds: new Set(selectedIds),
    initialBounds: bounds,
    shapeBounds: Object.fromEntries(
      Array.from(selectedIds.values()).map((id) => {
        return [
          id,
          {
            initialShape: pageShapes[id],
            initialShapeBounds: shapesBounds[id],
          },
        ]
      })
    ),
  }
}

export type TransformSnapshot = ReturnType<typeof getTransformSnapshot>
