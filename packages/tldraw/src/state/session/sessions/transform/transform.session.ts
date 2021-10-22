import { TLBounds, TLBoundsCorner, TLBoundsEdge, Utils } from '@tldraw/core'
import { Vec } from '@tldraw/vec'
import type { TLSnapLine, TLBoundsWithCenter } from '@tldraw/core'
import { Session, SessionType, TLDrawShape, TLDrawStatus } from '~types'
import type { Data } from '~types'
import { TLDR } from '~state/tldr'
import type { Command } from 'rko'
import { SLOW_SPEED, SNAP_DISTANCE } from '~state/constants'

type SnapInfo =
  | {
      state: 'empty'
    }
  | {
      state: 'ready'
      bounds: TLBoundsWithCenter[]
    }

export class TransformSession extends Session {
  static type = SessionType.Transform
  status = TLDrawStatus.Transforming
  scaleX = 1
  scaleY = 1
  transformType: TLBoundsEdge | TLBoundsCorner
  origin: number[]
  snapshot: TransformSnapshot
  isCreate: boolean
  initialSelectedIds: string[]
  snapInfo: SnapInfo = { state: 'empty' }
  prevPoint = [0, 0]
  speed = 1

  constructor(
    data: Data,
    viewport: TLBounds,
    point: number[],
    transformType: TLBoundsEdge | TLBoundsCorner = TLBoundsCorner.BottomRight,
    isCreate = false
  ) {
    super(viewport)
    this.origin = point
    this.transformType = transformType
    this.snapshot = getTransformSnapshot(data, transformType)
    this.isCreate = isCreate
    this.initialSelectedIds = TLDR.getSelectedIds(data, data.appState.currentPageId)
  }

  start = (data: Data) => {
    this.createSnapInfo(data)
    return void null
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update = (data: Data, point: number[], shiftKey = false, altKey = false, metaKey = false) => {
    const {
      transformType,
      snapshot: { shapeBounds, initialBounds, isAllAspectRatioLocked },
    } = this

    const shapes = {} as Record<string, TLDrawShape>

    const pageState = TLDR.getPageState(data, data.appState.currentPageId)

    const delta = Vec.sub(point, this.origin)

    let newBounds = Utils.getTransformedBoundingBox(
      initialBounds,
      transformType,
      delta,
      0,
      shiftKey || isAllAspectRatioLocked
    )

    // Should we snap?

    const speed = Vec.dist(point, this.prevPoint)

    this.prevPoint = point

    const speedChange = speed - this.speed

    this.speed = this.speed + speedChange * (speedChange > 1 ? 0.5 : 0.15)

    let snapLines: TLSnapLine[] = []

    const { currentPageId } = data.appState

    const { zoom } = data.document.pageStates[currentPageId].camera

    if (
      ((data.settings.isSnapping && !metaKey) || (!data.settings.isSnapping && metaKey)) &&
      this.speed * zoom < SLOW_SPEED &&
      this.snapInfo.state === 'ready'
    ) {
      const snapResult = Utils.getSnapPoints(
        Utils.getBoundsWithCenter(newBounds),
        this.snapInfo.bounds.filter(
          (bounds) =>
            Utils.boundsContain(this.viewport, bounds) || Utils.boundsCollide(this.viewport, bounds)
        ),
        SNAP_DISTANCE / zoom
      )

      if (snapResult) {
        snapLines = snapResult.snapLines

        newBounds = Utils.getTransformedBoundingBox(
          initialBounds,
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

    shapeBounds.forEach(({ id, initialShape, initialShapeBounds, transformOrigin }) => {
      const newShapeBounds = Utils.getRelativeTransformedBoundingBox(
        newBounds,
        initialBounds,
        initialShapeBounds,
        this.scaleX < 0,
        this.scaleY < 0
      )

      shapes[id] = TLDR.transform(
        TLDR.getShape(data, id, data.appState.currentPageId),
        newShapeBounds,
        {
          type: this.transformType,
          initialShape,
          scaleX: this.scaleX,
          scaleY: this.scaleY,
          transformOrigin,
        }
      )
    })

    return {
      appState: {
        snapLines,
      },
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
    const { shapeBounds } = this.snapshot

    const shapes = {} as Record<string, TLDrawShape | undefined>

    if (this.isCreate) {
      shapeBounds.forEach((shape) => (shapes[shape.id] = undefined))
    } else {
      shapeBounds.forEach((shape) => (shapes[shape.id] = shape.initialShape))
    }

    return {
      appState: {
        snapLines: [],
      },
      document: {
        pages: {
          [data.appState.currentPageId]: {
            shapes,
          },
        },
        pageStates: {
          [data.appState.currentPageId]: {
            selectedIds: this.isCreate ? [] : shapeBounds.map((shape) => shape.id),
          },
        },
      },
    }
  }

  complete = (data: Data): Data | Command<Data> | undefined => {
    const { hasUnlockedShapes, shapeBounds } = this.snapshot
    undefined
    if (!hasUnlockedShapes) return

    const beforeShapes: Record<string, TLDrawShape | undefined> = {}
    const afterShapes: Record<string, TLDrawShape> = {}

    let beforeSelectedIds: string[]
    let afterSelectedIds: string[]

    if (this.isCreate) {
      beforeSelectedIds = []
      afterSelectedIds = []
      shapeBounds.forEach((shape) => {
        beforeShapes[shape.id] = undefined
        afterShapes[shape.id] = TLDR.getShape(data, shape.id, data.appState.currentPageId)
      })
    } else {
      beforeSelectedIds = this.initialSelectedIds
      afterSelectedIds = this.initialSelectedIds
      shapeBounds.forEach((shape) => {
        beforeShapes[shape.id] = shape.initialShape
        afterShapes[shape.id] = TLDR.getShape(data, shape.id, data.appState.currentPageId)
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
            [data.appState.currentPageId]: {
              shapes: beforeShapes,
            },
          },
          pageStates: {
            [data.appState.currentPageId]: {
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
            [data.appState.currentPageId]: {
              shapes: afterShapes,
            },
          },
          pageStates: {
            [data.appState.currentPageId]: {
              selectedIds: afterSelectedIds,
              hoveredId: undefined,
              editingId: undefined,
            },
          },
        },
      },
    }
  }

  private createSnapInfo = async (data: Data) => {
    const { initialShapeIds } = this.snapshot
    const { currentPageId } = data.appState
    const page = data.document.pages[currentPageId]

    this.snapInfo = {
      state: 'ready',
      bounds: Object.values(page.shapes)
        .filter((shape) => !initialShapeIds.includes(shape.id))
        .map((shape) => Utils.getBoundsWithCenter(TLDR.getRotatedBounds(shape))),
    }
  }
}

export function getTransformSnapshot(data: Data, transformType: TLBoundsEdge | TLBoundsCorner) {
  const initialShapes = TLDR.getSelectedBranchSnapshot(data, data.appState.currentPageId)

  const initialShapeIds = initialShapes.map((shape) => shape.id)

  const hasUnlockedShapes = initialShapes.length > 0

  const isAllAspectRatioLocked = initialShapes.every(
    (shape) => shape.isAspectRatioLocked || TLDR.getShapeUtils(shape).isAspectRatioLocked
  )

  const shapesBounds = Object.fromEntries(
    initialShapes.map((shape) => [shape.id, TLDR.getBounds(shape)])
  )

  const boundsArr = Object.values(shapesBounds)

  const commonBounds = Utils.getCommonBounds(boundsArr)

  const initialInnerBounds = Utils.getBoundsFromPoints(boundsArr.map(Utils.getBoundsCenter))

  // Return a mapping of shapes to bounds together with the relative
  // positions of the shape's bounds within the common bounds shape.
  return {
    type: transformType,
    hasUnlockedShapes,
    isAllAspectRatioLocked,
    initialShapeIds,
    initialShapes,
    initialBounds: commonBounds,
    shapeBounds: initialShapes.map((shape) => {
      const initialShapeBounds = shapesBounds[shape.id]
      const ic = Utils.getBoundsCenter(initialShapeBounds)

      const ix = (ic[0] - initialInnerBounds.minX) / initialInnerBounds.width
      const iy = (ic[1] - initialInnerBounds.minY) / initialInnerBounds.height

      return {
        id: shape.id,
        initialShape: shape,
        initialShapeBounds,
        transformOrigin: [ix, iy],
      }
    }),
  }
}

export type TransformSnapshot = ReturnType<typeof getTransformSnapshot>
