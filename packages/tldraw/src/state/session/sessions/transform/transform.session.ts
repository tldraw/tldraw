import { TLBoundsCorner, TLBoundsEdge, Utils } from '@tldraw/core'
import { Vec } from '@tldraw/vec'
import { Session, SessionType, TLDrawShape, TLDrawStatus } from '~types'
import type { Data } from '~types'
import { TLDR } from '~state/tldr'
import type { Command } from 'rko'

export class TransformSession implements Session {
  static type = SessionType.Transform
  status = TLDrawStatus.Transforming
  scaleX = 1
  scaleY = 1
  transformType: TLBoundsEdge | TLBoundsCorner
  origin: number[]
  snapshot: TransformSnapshot
  isCreate: boolean
  initialSelectedIds: string[]

  constructor(
    data: Data,
    point: number[],
    transformType: TLBoundsEdge | TLBoundsCorner = TLBoundsCorner.BottomRight,
    isCreate = false
  ) {
    this.origin = point
    this.transformType = transformType
    this.snapshot = getTransformSnapshot(data, transformType)
    this.isCreate = isCreate
    this.initialSelectedIds = TLDR.getSelectedIds(data, data.appState.currentPageId)
  }

  start = () => void null

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update = (data: Data, point: number[], shiftKey: boolean, altKey: boolean, metaKey: boolean) => {
    const {
      transformType,
      snapshot: { shapeBounds, initialBounds, isAllAspectRatioLocked },
    } = this

    const shapes = {} as Record<string, TLDrawShape>

    const pageState = TLDR.getPageState(data, data.appState.currentPageId)

    const newBoundingBox = Utils.getTransformedBoundingBox(
      initialBounds,
      transformType,
      Vec.sub(point, this.origin),
      pageState.boundsRotation,
      shiftKey || isAllAspectRatioLocked
    )

    // Now work backward to calculate a new bounding box for each of the shapes.

    this.scaleX = newBoundingBox.scaleX
    this.scaleY = newBoundingBox.scaleY

    shapeBounds.forEach(({ id, initialShape, initialShapeBounds, transformOrigin }) => {
      const newShapeBounds = Utils.getRelativeTransformedBoundingBox(
        newBoundingBox,
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
      document: {
        pages: {
          [data.appState.currentPageId]: {
            shapes,
          },
        },
      },
    }
  }

  complete(data: Data): Data | Command<Data> | undefined {
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
}

export function getTransformSnapshot(data: Data, transformType: TLBoundsEdge | TLBoundsCorner) {
  const initialShapes = TLDR.getSelectedBranchSnapshot(data, data.appState.currentPageId)

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
