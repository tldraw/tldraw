import {
  TLBoundsCorner,
  TLSnapLine,
  TLBoundsEdge,
  Utils,
  TLBoundsWithCenter,
  TLBounds,
} from '@tldraw/core'
import { Vec } from '@tldraw/vec'
import { SessionType, TLDrawCommand, TLDrawPatch, TLDrawShape, TLDrawStatus } from '~types'
import { TLDR } from '~state/TLDR'
import { SLOW_SPEED, SNAP_DISTANCE } from '~constants'
import { BaseSession } from '../BaseSession'
import type { TLDrawApp } from '../../internal'

type SnapInfo =
  | {
      state: 'empty'
    }
  | {
      state: 'ready'
      bounds: TLBoundsWithCenter[]
    }

export class TransformSingleSession extends BaseSession {
  type = SessionType.TransformSingle
  status = TLDrawStatus.Transforming
  transformType: TLBoundsEdge | TLBoundsCorner
  scaleX = 1
  scaleY = 1
  isCreate: boolean
  initialShape: TLDrawShape
  initialShapeBounds: TLBounds
  initialCommonBounds: TLBounds
  snapInfo: SnapInfo = { state: 'empty' }
  prevPoint = [0, 0]
  speed = 1

  constructor(
    app: TLDrawApp,
    id: string,
    transformType: TLBoundsEdge | TLBoundsCorner,
    isCreate = false
  ) {
    super(app)
    this.isCreate = isCreate
    this.transformType = transformType

    const shape = this.app.getShape(id)
    this.initialShape = shape
    this.initialShapeBounds = TLDR.getBounds(shape)
    this.initialCommonBounds = TLDR.getRotatedBounds(shape)
    this.app.mutables.selectedIds = [...this.initialShape.id]
  }

  start = (): TLDrawPatch | undefined => {
    this.snapInfo = {
      state: 'ready',
      bounds: this.app.shapes
        .filter((shape) => shape.id !== this.initialShape.id)
        .map((shape) => Utils.getBoundsWithCenter(TLDR.getRotatedBounds(shape))),
    }

    return void null
  }

  update = (): TLDrawPatch | undefined => {
    const {
      transformType,
      initialShape,
      initialShapeBounds,
      app: {
        state: { settings: isSnapping },
        currentPageId,
        pageState: { camera },
        mutables: { viewport, currentPoint, previousPoint, originPoint, shiftKey, metaKey },
      },
    } = this

    if (initialShape.isLocked) return void null

    const delta = Vec.sub(currentPoint, originPoint)

    const shapes = {} as Record<string, Partial<TLDrawShape>>

    const shape = this.app.getShape(initialShape.id)

    const utils = TLDR.getShapeUtils(shape)

    let newBounds = Utils.getTransformedBoundingBox(
      initialShapeBounds,
      transformType,
      delta,
      shape.rotation,
      shiftKey || shape.isAspectRatioLocked || utils.isAspectRatioLocked
    )

    // Should we snap?

    const speed = Vec.dist(currentPoint, previousPoint)

    const speedChange = speed - this.speed

    this.speed = this.speed + speedChange * (speedChange > 1 ? 0.5 : 0.15)

    let snapLines: TLSnapLine[] = []

    if (
      ((isSnapping && !metaKey) || (!isSnapping && metaKey)) &&
      !initialShape.rotation && // not now anyway
      this.speed * camera.zoom < SLOW_SPEED &&
      this.snapInfo.state === 'ready'
    ) {
      const snapResult = Utils.getSnapPoints(
        Utils.getBoundsWithCenter(newBounds),
        this.snapInfo.bounds.filter(
          (bounds) => Utils.boundsContain(viewport, bounds) || Utils.boundsCollide(viewport, bounds)
        ),
        SNAP_DISTANCE / camera.zoom
      )

      if (snapResult) {
        snapLines = snapResult.snapLines

        newBounds = Utils.getTransformedBoundingBox(
          initialShapeBounds,
          transformType,
          Vec.sub(delta, snapResult.offset),
          shape.rotation,
          shiftKey || shape.isAspectRatioLocked || utils.isAspectRatioLocked
        )
      }
    }

    const afterShape = TLDR.getShapeUtils(shape).transformSingle(shape, newBounds, {
      initialShape,
      type: this.transformType,
      scaleX: newBounds.scaleX,
      scaleY: newBounds.scaleY,
      transformOrigin: [0.5, 0.5],
    })

    if (afterShape) {
      shapes[shape.id] = afterShape
    }

    return {
      appState: {
        snapLines,
      },
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
      initialShape,
      app: { currentPageId },
    } = this

    const shapes = {} as Record<string, TLDrawShape | undefined>

    if (this.isCreate) {
      shapes[initialShape.id] = undefined
    } else {
      shapes[initialShape.id] = initialShape
    }

    return {
      appState: {
        snapLines: [],
      },
      document: {
        pages: {
          [currentPageId]: {
            shapes,
          },
        },
        pageStates: {
          [currentPageId]: {
            selectedIds: this.isCreate ? [] : [initialShape.id],
          },
        },
      },
    }
  }

  complete = (): TLDrawPatch | TLDrawCommand | undefined => {
    const {
      initialShape,
      app: { currentPageId },
    } = this

    if (initialShape.isLocked) return

    const beforeShapes = {} as Record<string, Partial<TLDrawShape> | undefined>
    const afterShapes = {} as Record<string, Partial<TLDrawShape>>

    beforeShapes[initialShape.id] = this.isCreate ? undefined : initialShape

    afterShapes[initialShape.id] = TLDR.onSessionComplete(this.app.getShape(initialShape.id))

    return {
      id: 'transform_single',
      before: {
        appState: {
          snapLines: [],
        },
        document: {
          pages: {
            [currentPageId]: {
              shapes: beforeShapes,
            },
          },
          pageStates: {
            [currentPageId]: {
              selectedIds: this.isCreate ? [] : [initialShape.id],
              editingId: undefined,
              hoveredId: undefined,
            },
          },
        },
      },
      after: {
        appState: {
          snapLines: [],
        },
        document: {
          pages: {
            [currentPageId]: {
              shapes: afterShapes,
            },
          },
          pageStates: {
            [currentPageId]: {
              selectedIds: [initialShape.id],
              editingId: undefined,
              hoveredId: undefined,
            },
          },
        },
      },
    }
  }
}
