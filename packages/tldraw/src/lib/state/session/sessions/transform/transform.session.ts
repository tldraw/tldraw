import { TLBoundsCorner, TLBoundsEdge, Utils, Vec } from '@tldraw/core'
import { Session } from '../../../state-types'
import { Data } from '../../../state-types'
import { TLDR } from '../../../tldr'

export class TransformSession implements Session {
  id: 'transform'
  scaleX = 1
  scaleY = 1
  transformType: TLBoundsEdge | TLBoundsCorner
  origin: number[]
  snapshot: TransformSnapshot

  constructor(
    data: Data,
    point: number[],
    transformType: TLBoundsEdge | TLBoundsCorner = TLBoundsCorner.BottomRight,
  ) {
    this.origin = point
    this.transformType = transformType
    this.snapshot = getTransformSnapshot(data, transformType)
  }

  start = (data: Data) => data

  update = (data: Data, point: number[], isAspectRatioLocked = false): Data => {
    const {
      transformType,
      snapshot: { shapeBounds, initialBounds, isAllAspectRatioLocked },
    } = this

    const next = {
      ...data,
      page: {
        ...data.page,
      },
    }

    const { shapes } = next.page

    const newBoundingBox = Utils.getTransformedBoundingBox(
      initialBounds,
      transformType,
      Vec.vec(this.origin, point),
      data.pageState.boundsRotation,
      isAspectRatioLocked || isAllAspectRatioLocked,
    )

    // Now work backward to calculate a new bounding box for each of the shapes.

    this.scaleX = newBoundingBox.scaleX
    this.scaleY = newBoundingBox.scaleY

    next.page.shapes = {
      ...next.page.shapes,
      ...Object.fromEntries(
        Object.entries(shapeBounds).map(
          ([id, { initialShape, initialShapeBounds, transformOrigin }]) => {
            const newShapeBounds = Utils.getRelativeTransformedBoundingBox(
              newBoundingBox,
              initialBounds,
              initialShapeBounds,
              this.scaleX < 0,
              this.scaleY < 0,
            )

            const shape = shapes[id]

            return [
              id,
              {
                ...initialShape,
                ...TLDR.transform(next, shape, newShapeBounds, {
                  type: this.transformType,
                  initialShape,
                  scaleX: this.scaleX,
                  scaleY: this.scaleY,
                  transformOrigin,
                }),
              },
            ]
          },
        ),
      ),
    }

    return next
  }

  cancel = (data: Data) => {
    const { shapeBounds } = this.snapshot

    return {
      ...data,
      page: {
        ...data.page,
        shapes: {
          ...data.page.shapes,
          ...Object.fromEntries(
            Object.entries(shapeBounds).map(([id, { initialShape }]) => [id, initialShape]),
          ),
        },
      },
    }
  }

  complete(data: Data) {
    const { hasUnlockedShapes, shapeBounds } = this.snapshot

    if (!hasUnlockedShapes) return data

    return {
      id: 'transform',
      before: {
        page: {
          shapes: Object.fromEntries(
            Object.entries(shapeBounds).map(([id, { initialShape }]) => [id, initialShape]),
          ),
        },
      },
      after: {
        page: {
          shapes: Object.fromEntries(
            this.snapshot.initialShapes.map((shape) => [shape.id, data.page.shapes[shape.id]]),
          ),
        },
      },
    }
  }
}

export function getTransformSnapshot(data: Data, transformType: TLBoundsEdge | TLBoundsCorner) {
  const initialShapes = TLDR.getSelectedBranchSnapshot(data)

  const hasUnlockedShapes = initialShapes.length > 0

  const isAllAspectRatioLocked = initialShapes.every(
    (shape) => shape.isAspectRatioLocked || TLDR.getShapeUtils(shape).isAspectRatioLocked,
  )

  const shapesBounds = Object.fromEntries(
    initialShapes.map((shape) => [shape.id, TLDR.getBounds(shape)]),
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
    shapeBounds: Object.fromEntries(
      initialShapes.map((shape) => {
        const initialShapeBounds = shapesBounds[shape.id]
        const ic = Utils.getBoundsCenter(initialShapeBounds)

        const ix = (ic[0] - initialInnerBounds.minX) / initialInnerBounds.width
        const iy = (ic[1] - initialInnerBounds.minY) / initialInnerBounds.height

        return [
          shape.id,
          {
            initialShape: shape,
            initialShapeBounds,
            transformOrigin: [ix, iy],
          },
        ]
      }),
    ),
  }
}

export type TransformSnapshot = ReturnType<typeof getTransformSnapshot>
