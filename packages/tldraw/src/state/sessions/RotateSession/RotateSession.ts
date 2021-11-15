import { Utils } from '@tldraw/core'
import { Vec } from '@tldraw/vec'
import { SessionType, TLDrawCommand, TLDrawPatch, TLDrawShape, TLDrawStatus } from '~types'
import { TLDR } from '~state/TLDR'
import { BaseSession } from '../BaseSession'
import type { TLDrawApp } from '../../internal'

export class RotateSession extends BaseSession {
  type = SessionType.Rotate
  status = TLDrawStatus.Transforming
  delta = [0, 0]
  commonBoundsCenter: number[]
  initialAngle: number
  initialShapes: {
    shape: TLDrawShape
    center: number[]
  }[]
  changes: Record<string, Partial<TLDrawShape>> = {}

  constructor(app: TLDrawApp) {
    super(app)

    const {
      app: { currentPageId, pageState, mutables },
    } = this

    const initialShapes = TLDR.getSelectedBranchSnapshot(app.state, currentPageId).filter(
      (shape) => !shape.isLocked
    )

    if (initialShapes.length === 0) {
      throw Error('No selected shapes!')
    }

    if (mutables.selectedIds === pageState.selectedIds) {
      if (mutables.center === undefined) {
        throw Error('The center was not added to the cache!')
      }

      this.commonBoundsCenter = mutables.center
    } else {
      this.commonBoundsCenter = Utils.getBoundsCenter(
        Utils.getCommonBounds(initialShapes.map(TLDR.getBounds))
      )
      mutables.selectedIds = pageState.selectedIds
      mutables.center = this.commonBoundsCenter
    }

    this.initialShapes = initialShapes
      .filter((shape) => shape.children === undefined)
      .map((shape) => {
        return {
          shape,
          center: this.app.getShapeUtils(shape).getCenter(shape),
        }
      })

    this.initialAngle = Vec.angle(this.commonBoundsCenter, app.mutables.originPoint)
  }

  start = (): TLDrawPatch | undefined => void null

  update = (): TLDrawPatch | undefined => {
    const {
      commonBoundsCenter,
      initialShapes,
      app: {
        currentPageId,
        mutables: { currentPoint, shiftKey },
      },
    } = this

    const shapes: Record<string, Partial<TLDrawShape>> = {}

    let directionDelta = Vec.angle(commonBoundsCenter, currentPoint) - this.initialAngle

    if (shiftKey) {
      directionDelta = Utils.snapAngleToSegments(directionDelta, 24) // 15 degrees
    }

    // Update the shapes
    initialShapes.forEach(({ center, shape }) => {
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
        shapes[shape.id] = change
      }
    })

    this.changes = shapes

    return {
      document: {
        pages: {
          [currentPageId]: {
            shapes,
          },
        },
      },
    }
  }

  cancel = (): TLDrawPatch | undefined => {
    const {
      initialShapes,
      app: { currentPageId },
    } = this

    const shapes: Record<string, TLDrawShape> = {}
    initialShapes.forEach(({ shape }) => (shapes[shape.id] = shape))

    return {
      document: {
        pages: {
          [currentPageId]: {
            shapes,
          },
        },
      },
    }
  }

  complete = (): TLDrawPatch | TLDrawCommand | undefined => {
    const {
      initialShapes,
      app: { currentPageId },
    } = this

    const beforeShapes = {} as Record<string, Partial<TLDrawShape>>
    const afterShapes = this.changes

    initialShapes.forEach(({ shape: { id, point, rotation, handles } }) => {
      beforeShapes[id] = { point, rotation, handles }
    })

    return {
      id: 'rotate',
      before: {
        document: {
          pages: {
            [currentPageId]: {
              shapes: beforeShapes,
            },
          },
        },
      },
      after: {
        document: {
          pages: {
            [currentPageId]: {
              shapes: afterShapes,
            },
          },
        },
      },
    }
  }
}
