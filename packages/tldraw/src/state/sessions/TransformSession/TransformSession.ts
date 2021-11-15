import { TLBounds, TLBoundsCorner, TLBoundsEdge, Utils } from '@tldraw/core'
import { Vec } from '@tldraw/vec'
import type { TLSnapLine, TLBoundsWithCenter } from '@tldraw/core'
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

export class TransformSession extends BaseSession {
  type = SessionType.Transform
  status = TLDrawStatus.Transforming
  scaleX = 1
  scaleY = 1
  initialShapes: TLDrawShape[]
  initialShapeIds: string[]
  initialSelectedIds: string[]
  shapeBounds: {
    initialShape: TLDrawShape
    initialShapeBounds: TLBounds
    transformOrigin: number[]
  }[]
  hasUnlockedShapes: boolean
  isAllAspectRatioLocked: boolean
  initialCommonBounds: TLBounds
  snapInfo: SnapInfo = { state: 'empty' }
  prevPoint = [0, 0]
  speed = 1

  constructor(
    app: TLDrawApp,
    public transformType: TLBoundsEdge | TLBoundsCorner = TLBoundsCorner.BottomRight,
    public isCreate = false
  ) {
    super(app)
    this.initialSelectedIds = [...this.app.selectedIds]
    this.app.mutables.selectedIds = [...this.initialSelectedIds]

    this.initialShapes = TLDR.getSelectedBranchSnapshot(
      this.app.state,
      this.app.currentPageId
    ).filter((shape) => !shape.isLocked)

    this.initialShapeIds = this.initialShapes.map((shape) => shape.id)

    this.hasUnlockedShapes = this.initialShapes.length > 0

    this.isAllAspectRatioLocked = this.initialShapes.every(
      (shape) => shape.isAspectRatioLocked || TLDR.getShapeUtils(shape).isAspectRatioLocked
    )

    const shapesBounds = Object.fromEntries(
      this.initialShapes.map((shape) => [shape.id, TLDR.getBounds(shape)])
    )

    const boundsArr = Object.values(shapesBounds)

    this.initialCommonBounds = Utils.getCommonBounds(boundsArr)

    const initialInnerBounds = Utils.getBoundsFromPoints(boundsArr.map(Utils.getBoundsCenter))

    // Return a mapping of shapes to bounds together with the relative
    // positions of the shape's bounds within the common bounds shape.
    this.shapeBounds = this.initialShapes.map((shape) => {
      const initialShapeBounds = shapesBounds[shape.id]
      const ic = Utils.getBoundsCenter(initialShapeBounds)

      const ix = (ic[0] - initialInnerBounds.minX) / initialInnerBounds.width
      const iy = (ic[1] - initialInnerBounds.minY) / initialInnerBounds.height

      return {
        initialShape: shape,
        initialShapeBounds,
        transformOrigin: [ix, iy],
      }
    })
  }

  start = (): TLDrawPatch | undefined => {
    this.snapInfo = {
      state: 'ready',
      bounds: this.app.shapes
        .filter((shape) => !this.initialShapeIds.includes(shape.id))
        .map((shape) => Utils.getBoundsWithCenter(TLDR.getRotatedBounds(shape))),
    }

    return void null
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update = (): TLDrawPatch | undefined => {
    const {
      transformType,
      shapeBounds,
      initialCommonBounds,
      isAllAspectRatioLocked,
      app: {
        state: { settings: isSnapping },
        currentPageId,
        pageState: { camera },
        mutables: { viewport, currentPoint, previousPoint, originPoint, shiftKey, metaKey },
      },
    } = this

    const shapes = {} as Record<string, TLDrawShape>

    const delta = Vec.sub(currentPoint, originPoint)

    let newBounds = Utils.getTransformedBoundingBox(
      initialCommonBounds,
      transformType,
      delta,
      0,
      shiftKey || isAllAspectRatioLocked
    )

    // Should we snap?

    const speed = Vec.dist(currentPoint, previousPoint)

    const speedChange = speed - this.speed

    this.speed = this.speed + speedChange * (speedChange > 1 ? 0.5 : 0.15)

    let snapLines: TLSnapLine[] = []

    if (
      ((isSnapping && !metaKey) || (!isSnapping && metaKey)) &&
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
          initialCommonBounds,
          transformType,
          Vec.sub(delta, snapResult.offset),
          0,
          shiftKey || isAllAspectRatioLocked
        )
      }
    }

    // Now work backward to calculate a new bounding box for each of the shapes.

    this.scaleX = newBounds.scaleX
    this.scaleY = newBounds.scaleY

    shapeBounds.forEach(({ initialShape, initialShapeBounds, transformOrigin }) => {
      const newShapeBounds = Utils.getRelativeTransformedBoundingBox(
        newBounds,
        initialCommonBounds,
        initialShapeBounds,
        this.scaleX < 0,
        this.scaleY < 0
      )

      shapes[initialShape.id] = TLDR.transform(this.app.getShape(initialShape.id), newShapeBounds, {
        type: this.transformType,
        initialShape,
        scaleX: this.scaleX,
        scaleY: this.scaleY,
        transformOrigin,
      })
    })

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
      shapeBounds,
      app: { currentPageId },
    } = this

    const shapes = {} as Record<string, TLDrawShape | undefined>

    if (this.isCreate) {
      shapeBounds.forEach((shape) => (shapes[shape.initialShape.id] = undefined))
    } else {
      shapeBounds.forEach((shape) => (shapes[shape.initialShape.id] = shape.initialShape))
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
            selectedIds: this.isCreate ? [] : shapeBounds.map((shape) => shape.initialShape.id),
          },
        },
      },
    }
  }

  complete = (): TLDrawPatch | TLDrawCommand | undefined => {
    const {
      isCreate,
      shapeBounds,
      hasUnlockedShapes,
      app: { currentPageId },
    } = this

    if (!hasUnlockedShapes) return

    const beforeShapes: Record<string, TLDrawShape | undefined> = {}
    const afterShapes: Record<string, TLDrawShape> = {}

    let beforeSelectedIds: string[]
    let afterSelectedIds: string[]

    if (isCreate) {
      beforeSelectedIds = []
      afterSelectedIds = []
      shapeBounds.forEach(({ initialShape }) => {
        beforeShapes[initialShape.id] = undefined
        afterShapes[initialShape.id] = this.app.getShape(initialShape.id)
      })
    } else {
      beforeSelectedIds = this.initialSelectedIds
      afterSelectedIds = this.initialSelectedIds
      shapeBounds.forEach(({ initialShape }) => {
        beforeShapes[initialShape.id] = initialShape
        afterShapes[initialShape.id] = this.app.getShape(initialShape.id)
      })
    }

    return {
      id: 'transform',
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
              selectedIds: beforeSelectedIds,
              hoveredId: undefined,
              editingId: undefined,
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
              selectedIds: afterSelectedIds,
              hoveredId: undefined,
              editingId: undefined,
            },
          },
        },
      },
    }
  }
}
