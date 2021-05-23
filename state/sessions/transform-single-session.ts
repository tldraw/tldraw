import { Data, Edge, Corner } from "types"
import * as vec from "utils/vec"
import BaseSession from "./base-session"
import commands from "state/commands"
import { current } from "immer"
import { getShapeUtils } from "lib/shape-utils"
import {
  getTransformedBoundingBox,
  getCommonBounds,
  getRotatedCorners,
  getTransformAnchor,
  getPage,
  getShape,
  getSelectedShapes,
} from "utils/utils"

export default class TransformSingleSession extends BaseSession {
  transformType: Edge | Corner
  origin: number[]
  scaleX = 1
  scaleY = 1
  snapshot: TransformSingleSnapshot
  isCreating: boolean

  constructor(
    data: Data,
    transformType: Corner | Edge,
    point: number[],
    isCreating = false
  ) {
    super(data)
    this.origin = point
    this.transformType = transformType
    this.snapshot = getTransformSingleSnapshot(data, transformType)
    this.isCreating = isCreating
  }

  update(data: Data, point: number[], isAspectRatioLocked = false) {
    const { transformType } = this

    const { initialShapeBounds, currentPageId, initialShape, id } =
      this.snapshot

    const shape = getShape(data, id, currentPageId)

    const newBoundingBox = getTransformedBoundingBox(
      initialShapeBounds,
      transformType,
      vec.vec(this.origin, point),
      shape.rotation,
      isAspectRatioLocked || !getShapeUtils(initialShape).canChangeAspectRatio
    )

    this.scaleX = newBoundingBox.scaleX
    this.scaleY = newBoundingBox.scaleY

    getShapeUtils(shape).transformSingle(shape, newBoundingBox, {
      initialShape,
      type: this.transformType,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      transformOrigin: [0.5, 0.5],
    })
  }

  cancel(data: Data) {
    const { id, initialShape, initialShapeBounds, currentPageId } =
      this.snapshot

    const shape = getShape(data, id, currentPageId)

    getShapeUtils(shape).transform(shape, initialShapeBounds, {
      initialShape,
      type: this.transformType,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      transformOrigin: [0.5, 0.5],
    })
  }

  complete(data: Data) {
    commands.transformSingle(
      data,
      this.snapshot,
      getTransformSingleSnapshot(data, this.transformType),
      this.scaleX,
      this.scaleY,
      this.isCreating
    )
  }
}

export function getTransformSingleSnapshot(
  data: Data,
  transformType: Edge | Corner
) {
  const shape = getSelectedShapes(current(data))[0]
  const bounds = getShapeUtils(shape).getBounds(shape)

  return {
    id: shape.id,
    currentPageId: data.currentPageId,
    type: transformType,
    initialShape: shape,
    initialShapeBounds: bounds,
  }
}

export type TransformSingleSnapshot = ReturnType<
  typeof getTransformSingleSnapshot
>
