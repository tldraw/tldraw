import { Utils } from '@tldraw/core'
import { Vec } from '@tldraw/vec'
import { Session, SessionType, TLDrawShape, TLDrawStatus } from '~types'
import type { Data } from '~types'
import { TLDR } from '~state/tldr'

const centerCache = new WeakMap<string[], number[]>()

export class RotateSession implements Session {
  static type = SessionType.Rotate
  status = TLDrawStatus.Transforming
  delta = [0, 0]
  origin: number[]
  snapshot: RotateSnapshot
  initialAngle: number
  changes: Record<string, Partial<TLDrawShape>> = {}

  constructor(data: Data, point: number[]) {
    this.origin = point
    this.snapshot = getRotateSnapshot(data)
    this.initialAngle = Vec.angle(this.snapshot.commonBoundsCenter, this.origin)
  }

  start = () => void null

  update = (data: Data, point: number[], shiftKey = false, altKey = false, metaKey = false) => {
    const { commonBoundsCenter, initialShapes } = this.snapshot

    const pageId = data.appState.currentPageId

    const shapes: Record<string, Partial<TLDrawShape>> = {}

    let directionDelta = Vec.angle(commonBoundsCenter, point) - this.initialAngle

    if (shiftKey) {
      directionDelta = Utils.snapAngleToSegments(directionDelta, 24) // 15 degrees
    }

    // Update the shapes
    initialShapes.forEach(({ id, center, shape }) => {
      const { rotation = 0 } = shape
      let shapeDelta = 0

      if (shiftKey) {
        const snappedRotation = Utils.snapAngleToSegments(rotation, 24)
        shapeDelta = snappedRotation - rotation
      }

      const change = TLDR.getRotatedShapeMutation(
        shape,
        center,
        commonBoundsCenter,
        shiftKey ? directionDelta + shapeDelta : directionDelta
      )

      if (change) {
        shapes[id] = change
      }
    })

    this.changes = shapes

    const nextBoundsRotation = this.snapshot.boundsRotation + directionDelta

    return {
      document: {
        pages: {
          [pageId]: {
            shapes,
          },
        },
        pageState: {
          boundsRotation: Utils.clampRadians(nextBoundsRotation),
        },
      },
    }
  }

  cancel = (data: Data) => {
    const { initialShapes } = this.snapshot
    const pageId = data.appState.currentPageId

    const shapes: Record<string, TLDrawShape> = {}

    for (const { id, shape } of initialShapes) {
      shapes[id] = shape
    }

    return {
      document: {
        pages: {
          [pageId]: {
            shapes,
          },
        },
      },
    }
  }

  complete(data: Data) {
    const { initialShapes } = this.snapshot
    const pageId = data.appState.currentPageId

    // if (!hasUnlockedShapes) return data

    const beforeShapes = {} as Record<string, Partial<TLDrawShape>>
    const afterShapes = this.changes

    initialShapes.forEach(({ id, shape: { point, rotation, handles } }) => {
      beforeShapes[id] = { point, rotation, handles }
    })

    return {
      id: 'rotate',
      before: {
        document: {
          pages: {
            [pageId]: {
              shapes: beforeShapes,
            },
          },
        },
      },
      after: {
        document: {
          pages: {
            [pageId]: {
              shapes: afterShapes,
            },
          },
        },
      },
    }
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getRotateSnapshot(data: Data) {
  const currentPageId = data.appState.currentPageId
  const pageState = TLDR.getPageState(data, currentPageId)
  const initialShapes = TLDR.getSelectedBranchSnapshot(data, currentPageId)

  const commonBoundsCenter = Utils.getFromCache(centerCache, pageState.selectedIds, () => {
    if (initialShapes.length === 0) {
      throw Error('No selected shapes!')
    }

    const shapesBounds = Object.fromEntries(
      initialShapes.map((shape) => [shape.id, TLDR.getBounds(shape)])
    )

    const bounds = Utils.getCommonBounds(Object.values(shapesBounds))

    return Utils.getBoundsCenter(bounds)
  })

  return {
    boundsRotation: pageState.boundsRotation || 0,
    commonBoundsCenter,
    initialShapes: initialShapes
      .filter((shape) => shape.children === undefined)
      .map((shape) => {
        const center = TLDR.getShapeUtils(shape).getCenter(shape)
        return {
          id: shape.id,
          shape,
          center,
        }
      }),
  }
}

export type RotateSnapshot = ReturnType<typeof getRotateSnapshot>
