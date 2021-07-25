import { Utils, Vec, TLBoundsEdge, TLBoundsCorner } from '@tldraw/core'
import { Data } from '../../types'
import { BaseSession } from './base-session'
import { getShapeUtils } from '../../shapes'
import { TLDrawState } from '../state'

export class TransformSingleSession implements BaseSession {
  transformType: TLBoundsEdge | TLBoundsCorner
  origin: number[]
  scaleX = 1
  scaleY = 1
  snapshot: TransformSingleSnapshot
  isCreating: boolean

  constructor(
    state: TLDrawState,
    data: Data,
    transformType: TLBoundsEdge | TLBoundsCorner,
    point: number[],
    isCreating = false
  ) {
    this.origin = point
    this.transformType = transformType
    this.snapshot = getTransformSingleSnapshot(data, transformType)
    this.isCreating = isCreating
  }

  update(
    state: TLDrawState,
    data: Data,
    point: number[],
    isAspectRatioLocked = false
  ): void {
    const { transformType } = this

    const { initialShapeBounds, initialShape, id } = this.snapshot

    const shape = data.page.shapes[id]

    const utils = getShapeUtils(shape)

    const newBoundingBox = Utils.getTransformedBoundingBox(
      initialShapeBounds,
      transformType,
      Vec.sub(point, this.origin),
      shape.rotation,
      isAspectRatioLocked ||
        shape.isAspectRatioLocked ||
        utils.isAspectRatioLocked
    )

    this.scaleX = newBoundingBox.scaleX
    this.scaleY = newBoundingBox.scaleY

    utils.transformSingle(shape, newBoundingBox, {
      initialShape,
      type: this.transformType,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      transformOrigin: [0.5, 0.5],
    })

    data.page.shapes[shape.id] = shape

    // tld.updateParents(data, [id])
  }

  cancel(state: TLDrawState, data: Data): void {
    const { id, initialShape } = this.snapshot
    data.page.shapes[id] = initialShape

    // state.updateParents(data, [id])
  }

  complete(state: TLDrawState, data: Data): void {
    if (!this.snapshot.hasUnlockedShape) return

    // commands.transformSingle(
    //   data,
    //   this.snapshot,
    //   getTransformSingleSnapshot(data, this.transformType),
    //   this.isCreating
    // )
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getTransformSingleSnapshot(
  data: Data,
  transformType: TLBoundsEdge | TLBoundsCorner
) {
  const shape = data.page.shapes[data.pageState.selectedIds[0]]

  const bounds = getShapeUtils(shape).getBounds(shape)

  return {
    id: shape.id,
    hasUnlockedShape: !shape.isLocked,
    type: transformType,
    initialShape: Utils.deepClone(shape),
    initialShapeBounds: bounds,
  }
}

export type TransformSingleSnapshot = ReturnType<
  typeof getTransformSingleSnapshot
>
