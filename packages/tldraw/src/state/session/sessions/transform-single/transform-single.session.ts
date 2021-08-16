import { TLBoundsCorner, TLBoundsEdge, Utils, Vec } from '@tldraw/core'
import { TLDrawShape, TLDrawStatus } from '~types'
import type { Session } from '~types'
import type { Data } from '~types'
import { TLDR } from '~state/tldr'

export class TransformSingleSession implements Session {
  id = 'transform_single'
  status = TLDrawStatus.Transforming
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

  start = () => void null

  update = (data: Data, point: number[], isAspectRatioLocked = false) => {
    const { transformType } = this

    const { initialShapeBounds, initialShape, id } = this.snapshot

    const shapes = {} as Record<string, Partial<TLDrawShape>>

    const shape = TLDR.getShape(data, id)

    const utils = TLDR.getShapeUtils(shape)

    const newBounds = Utils.getTransformedBoundingBox(
      initialShapeBounds,
      transformType,
      Vec.sub(point, this.origin),
      shape.rotation,
      isAspectRatioLocked || shape.isAspectRatioLocked || utils.isAspectRatioLocked
    )

    shapes[shape.id] = TLDR.getShapeUtils(shape).transformSingle(shape, newBounds, {
      initialShape,
      type: this.transformType,
      scaleX: newBounds.scaleX,
      scaleY: newBounds.scaleY,
      transformOrigin: [0.5, 0.5],
    })

    return {
      document: {
        pages: {
          [data.appState.currentPageId]: {
            shapes,
          },
        },
      },
    }
  }

  cancel = (data: Data) => {
    const { initialShape } = this.snapshot

    const shapes = {} as Record<string, Partial<TLDrawShape>>

    shapes[initialShape.id] = initialShape

    return {
      document: {
        pages: {
          [data.appState.currentPageId]: {
            shapes,
          },
        },
      },
    }
  }

  complete(data: Data) {
    if (!this.snapshot.hasUnlockedShape) return data

    const { initialShape } = this.snapshot

    const beforeShapes = {} as Record<string, Partial<TLDrawShape>>
    const afterShapes = {} as Record<string, Partial<TLDrawShape>>

    beforeShapes[initialShape.id] = initialShape
    afterShapes[initialShape.id] = TLDR.onSessionComplete(
      data,
      TLDR.getShape(data, initialShape.id)
    )

    return {
      id: this.commandId,
      before: {
        document: {
          pages: {
            [data.appState.currentPageId]: {
              shapes: beforeShapes,
            },
          },
        },
      },
      after: {
        document: {
          pages: {
            [data.appState.currentPageId]: {
              shapes: afterShapes,
            },
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
  const shape = TLDR.getShape(data, TLDR.getSelectedIds(data)[0])

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
