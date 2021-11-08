import { Utils, TLBounds } from '@tldraw/core'
import { Vec } from '@tldraw/vec'
import { Session, SessionType, TLDrawShape, TLDrawStatus } from '~types'
import type { TLDrawSnapshot } from '~types'
import { TLDR } from '~state/TLDR'

export class RotateSession extends Session {
  static type = SessionType.Rotate
  status = TLDrawStatus.Transforming
  delta = [0, 0]
  origin: number[]
  snapshot: RotateSnapshot
  initialAngle: number
  changes: Record<string, Partial<TLDrawShape>> = {}

  constructor(data: TLDrawSnapshot, viewport: TLBounds, point: number[]) {
    super(viewport)

    this.origin = point
    this.snapshot = getRotateSnapshot(data)
    this.initialAngle = Vec.angle(this.snapshot.commonBoundsCenter, this.origin)
  }

  start = () => void null

  update = (
    data: TLDrawSnapshot,
    point: number[],
    shiftKey = false,
    altKey = false,
    metaKey = false
  ) => {
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

  cancel = (data: TLDrawSnapshot) => {
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

  complete = (data: TLDrawSnapshot) => {
    const { initialShapes } = this.snapshot
    const pageId = data.appState.currentPageId

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
export function getRotateSnapshot(data: TLDrawSnapshot) {
  const currentPageId = data.appState.currentPageId
  const pageState = TLDR.getPageState(data, currentPageId)
  const initialShapes = TLDR.getSelectedBranchSnapshot(data, currentPageId)

  if (initialShapes.length === 0) {
    throw Error('No selected shapes!')
  }

  let commonBoundsCenter: number[]

  if (Session.cache.selectedIds === pageState.selectedIds) {
    if (Session.cache.center === undefined) {
      throw Error('The center was not added to the cache!')
    }

    commonBoundsCenter = Session.cache.center
  } else {
    commonBoundsCenter = Utils.getBoundsCenter(
      Utils.getCommonBounds(initialShapes.map(TLDR.getBounds))
    )
    Session.cache.selectedIds = pageState.selectedIds
    Session.cache.center = commonBoundsCenter
  }

  return {
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
