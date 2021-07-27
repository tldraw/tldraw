import { Utils, Vec, TLBoundsEdge, TLBoundsCorner } from '@tldraw/core'
import { BaseSession } from '.././session-types'
import { Data } from '../../../../types'
import { mutate } from '../../../command'
import { TLD } from '../../../tld'

export class TransformSession implements BaseSession {
  scaleX = 1
  scaleY = 1
  transformType: TLBoundsEdge | TLBoundsCorner
  origin: number[]
  snapshot: TransformSnapshot

  constructor(data: Data, point: number[], transformType: TLBoundsEdge | TLBoundsCorner = TLBoundsCorner.BottomRight) {
    this.origin = point
    this.transformType = transformType
    this.snapshot = getTransformSnapshot(data, transformType)
  }

  update(data: Data, point: number[], isAspectRatioLocked = false) {
    const { transformType } = this

    const { shapeBounds, initialBounds, isAllAspectRatioLocked } = this.snapshot

    const { shapes } = data.page

    const newBoundingBox = Utils.getTransformedBoundingBox(
      initialBounds,
      transformType,
      Vec.vec(this.origin, point),
      data.pageState.boundsRotation,
      isAspectRatioLocked || isAllAspectRatioLocked,
    )

    this.scaleX = newBoundingBox.scaleX
    this.scaleY = newBoundingBox.scaleY

    // Now work backward to calculate a new bounding box for each of the shapes.

    for (const id in shapeBounds) {
      const { initialShape, initialShapeBounds, transformOrigin } = shapeBounds[id]

      const newShapeBounds = Utils.getRelativeTransformedBoundingBox(
        newBoundingBox,
        initialBounds,
        initialShapeBounds,
        this.scaleX < 0,
        this.scaleY < 0,
      )

      const shape = shapes[id]

      TLD.getShapeUtils(shape).transform(shape, newShapeBounds, {
        type: this.transformType,
        initialShape,
        scaleX: this.scaleX,
        scaleY: this.scaleY,
        transformOrigin,
      })

      shapes[id] = { ...shape }
    }

    TLD.updateParents(data, Object.keys(shapeBounds))
  }

  cancel(data: Data) {
    const { shapeBounds } = this.snapshot

    for (const id in shapeBounds) {
      const shape = data.page.shapes[id]

      const { initialShape, initialShapeBounds, transformOrigin } = shapeBounds[id]

      TLD.getShapeUtils(shape).transform(shape, initialShapeBounds, {
        type: this.transformType,
        initialShape,
        scaleX: 1,
        scaleY: 1,
        transformOrigin,
      })

      TLD.updateParents(data, Object.keys(shapeBounds))
    }
  }

  complete(data: Data) {
    const { initialShapes, hasUnlockedShapes } = this.snapshot
    if (!hasUnlockedShapes) return
    const finalShapes = initialShapes.map((shape) => Utils.deepClone(data.page.shapes[shape.id]))
    return mutate(data, initialShapes, finalShapes)
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types

export function getTransformSnapshot(data: Data, transformType: TLBoundsEdge | TLBoundsCorner) {
  const initialShapes = TLD.getSelectedBranchSnapshot(data)

  const hasUnlockedShapes = initialShapes.length > 0

  const isAllAspectRatioLocked = initialShapes.every(
    (shape) => shape.isAspectRatioLocked || TLD.getShapeUtils(shape).isAspectRatioLocked,
  )

  const shapesBounds = Object.fromEntries(
    initialShapes.map((shape) => [shape.id, TLD.getShapeUtils(shape).getBounds(shape)]),
  )

  const boundsArr = Object.values(shapesBounds)

  const commonBounds = Utils.getCommonBounds(...boundsArr)

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
