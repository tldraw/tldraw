import { TLBoundsCorner, TLBoundsEdge, Utils, Vec } from '@tldraw/core'
import { TLDrawShape } from '../../../../shape'
import { Session } from '../../../state-types'
import { Data } from '../../../state-types'
import { TLDR } from '../../../tldr'

export class TransformSingleSession implements Session {
  id = 'transform_single'
  commandId: string
  transformType: TLBoundsEdge | TLBoundsCorner
  origin: number[]
  scaleX = 1
  scaleY = 1
  snapshot: TransformSingleSnapshot

  constructor(
    data: Data,
    point: number[],
    transformType: TLBoundsEdge | TLBoundsCorner = TLBoundsCorner.BottomRight,
    commandId = 'transform_single'
  ) {
    this.origin = point
    this.transformType = transformType
    this.snapshot = getTransformSingleSnapshot(data, transformType)
    this.commandId = commandId
  }

  start = (data: Data) => data

  update = (data: Data, point: number[], isAspectRatioLocked = false): Data => {
    const { transformType } = this

    const { initialShapeBounds, initialShape, id } = this.snapshot

    const shape = data.page.shapes[id]

    const utils = TLDR.getShapeUtils(shape)

    const newBounds = Utils.getTransformedBoundingBox(
      initialShapeBounds,
      transformType,
      Vec.sub(point, this.origin),
      shape.rotation,
      isAspectRatioLocked || shape.isAspectRatioLocked || utils.isAspectRatioLocked
    )

    return {
      ...data,
      page: {
        ...data.page,
        shapes: {
          ...data.page.shapes,
          [shape.id]: {
            ...initialShape,
            ...TLDR.getShapeUtils(shape).transformSingle(shape, newBounds, {
              initialShape,
              type: this.transformType,
              scaleX: newBounds.scaleX,
              scaleY: newBounds.scaleY,
              transformOrigin: [0.5, 0.5],
            }),
          } as TLDrawShape,
        },
      },
    }
  }

  cancel = (data: Data) => {
    const { id, initialShape } = this.snapshot
    data.page.shapes[id] = initialShape

    return {
      ...data,
      page: {
        ...data.page,
        shapes: {
          ...data.page.shapes,
          [id]: initialShape,
        },
      },
    }
  }

  complete(data: Data) {
    if (!this.snapshot.hasUnlockedShape) return data

    return {
      id: this.commandId,
      before: {
        page: {
          shapes: {
            [this.snapshot.id]: this.snapshot.initialShape,
          },
        },
      },
      after: {
        page: {
          shapes: {
            [this.snapshot.id]: data.page.shapes[this.snapshot.id],
          },
        },
      },
    }
  }
}

export function getTransformSingleSnapshot(
  data: Data,
  transformType: TLBoundsEdge | TLBoundsCorner
) {
  const shape = data.page.shapes[data.pageState.selectedIds[0]]

  if (!shape) {
    throw Error('You must have one shape selected.')
  }

  const bounds = TLDR.getBounds(shape)

  return {
    id: shape.id,
    hasUnlockedShape: !shape.isLocked,
    type: transformType,
    initialShape: Utils.deepClone(shape),
    initialShapeBounds: bounds,
  }
}

export type TransformSingleSnapshot = ReturnType<typeof getTransformSingleSnapshot>
