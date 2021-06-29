import { Data, Edge, Corner } from 'types'
import vec from 'utils/vec'
import BaseSession from './base-session'
import commands from 'state/commands'
import { getShapeUtils } from 'state/shape-utils'
import { deepClone, getTransformedBoundingBox } from 'utils'
import tld from 'utils/tld'

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

  update(data: Data, point: number[], isAspectRatioLocked = false): void {
    const { transformType } = this

    const { initialShapeBounds, initialShape, id } = this.snapshot

    const shape = tld.getShape(data, id)

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

    data.document.pages[data.currentPageId].shapes[shape.id] = { ...shape }

    tld.updateParents(data, [id])
  }

  cancel(data: Data): void {
    const { id, initialShape } = this.snapshot

    const page = tld.getPage(data)
    page.shapes[id] = initialShape

    tld.updateParents(data, [id])
  }

  complete(data: Data): void {
    if (!this.snapshot.hasUnlockedShape) return

    commands.transformSingle(
      data,
      this.snapshot,
      getTransformSingleSnapshot(data, this.transformType),
      this.isCreating
    )
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getTransformSingleSnapshot(
  data: Data,
  transformType: Edge | Corner
) {
  const shape = deepClone(tld.getSelectedShapes(data)[0])
  const bounds = getShapeUtils(shape).getBounds(shape)

  return {
    id: shape.id,
    hasUnlockedShape: !shape.isLocked,
    currentPageId: data.currentPageId,
    type: transformType,
    initialShape: shape,
    initialShapeBounds: bounds,
  }
}

export type TransformSingleSnapshot = ReturnType<
  typeof getTransformSingleSnapshot
>
