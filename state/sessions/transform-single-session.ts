import { Data, TransformEdge, TransformCorner } from "types"
import * as vec from "utils/vec"
import BaseSession from "./base-session"
import commands from "state/commands"
import { current } from "immer"
import { getShapeUtils } from "lib/shapes"
import {
  getTransformedBoundingBox,
  getCommonBounds,
  getRotatedCorners,
  getTransformAnchor,
} from "utils/utils"

export default class TransformSingleSession extends BaseSession {
  delta = [0, 0]
  scaleX = 1
  scaleY = 1
  transformType: TransformEdge | TransformCorner
  snapshot: TransformSingleSnapshot
  origin: number[]

  constructor(
    data: Data,
    transformType: TransformCorner | TransformEdge,
    point: number[]
  ) {
    super(data)
    this.origin = point
    this.transformType = transformType
    this.snapshot = getTransformSingleSnapshot(data, transformType)
  }

  update(data: Data, point: number[]) {
    const { transformType } = this

    const { initialShapeBounds, currentPageId, initialShape, id } =
      this.snapshot

    const shape = data.document.pages[currentPageId].shapes[id]

    const newBoundingBox = getTransformedBoundingBox(
      initialShapeBounds,
      transformType,
      vec.vec(this.origin, point),
      shape.rotation
    )

    this.scaleX = newBoundingBox.scaleX
    this.scaleY = newBoundingBox.scaleY

    getShapeUtils(shape).transformSingle(shape, newBoundingBox, {
      initialShape,
      type: this.transformType,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
    })
  }

  cancel(data: Data) {
    const { id, initialShape, initialShapeBounds, currentPageId } =
      this.snapshot

    const { shapes } = data.document.pages[currentPageId]

    const shape = shapes[id]

    getShapeUtils(shape).transform(shape, initialShapeBounds, {
      initialShape,
      type: this.transformType,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
    })
  }

  complete(data: Data) {
    commands.transformSingle(
      data,
      this.snapshot,
      getTransformSingleSnapshot(data, this.transformType),
      this.scaleX,
      this.scaleY
    )
  }
}

export function getTransformSingleSnapshot(
  data: Data,
  transformType: TransformEdge | TransformCorner
) {
  const {
    document: { pages },
    selectedIds,
    currentPageId,
  } = current(data)

  const id = Array.from(selectedIds)[0]
  const shape = pages[currentPageId].shapes[id]
  const bounds = getShapeUtils(shape).getBounds(shape)

  return {
    id,
    currentPageId,
    type: transformType,
    initialShape: shape,
    initialShapeBounds: bounds,
  }
}

export type TransformSingleSnapshot = ReturnType<
  typeof getTransformSingleSnapshot
>
