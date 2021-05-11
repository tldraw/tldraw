import { current } from "immer"
import { Bounds, Data, Shape, ShapeType } from "types"
import BaseSession from "./base-session"
import shapeUtils from "utils/shapes"
import { getBoundsFromPoints } from "utils/utils"
import * as vec from "utils/vec"
import { intersectCircleBounds } from "utils/intersections"

interface BrushSnapshot {
  selectedIds: string[]
  shapes: { shape: Shape; bounds: Bounds }[]
}

export default class BrushSession extends BaseSession {
  origin: number[]
  snapshot: BrushSnapshot

  constructor(data: Data, point: number[]) {
    super(data)

    this.origin = vec.round(point)

    this.snapshot = BrushSession.getSnapshot(data)
  }

  update = (data: Data, point: number[]) => {
    const { origin, snapshot } = this

    const brushBounds = getBoundsFromPoints(origin, point)

    data.selectedIds = [
      ...snapshot.selectedIds,
      ...snapshot.shapes
        .filter(({ shape, bounds }) => {
          switch (shape.type) {
            case ShapeType.Circle: {
              return (
                boundsContained(bounds, brushBounds) ||
                intersectCircleBounds(shape.point, shape.radius, brushBounds)
                  .length
              )
            }
            case ShapeType.Dot: {
              return (
                boundsContained(bounds, brushBounds) ||
                intersectCircleBounds(shape.point, 4, brushBounds).length
              )
            }
            case ShapeType.Rectangle: {
              return (
                boundsContained(bounds, brushBounds) ||
                boundsCollide(bounds, brushBounds)
              )
            }
            default: {
              return boundsContained(bounds, brushBounds)
            }
          }
        })
        .map(({ shape }) => shape.id),
    ]

    data.brush = brushBounds
  }

  cancel = (data: Data) => {
    data.brush = undefined
    data.selectedIds = this.snapshot.selectedIds
  }

  complete = (data: Data) => {
    data.brush = undefined
  }

  static getSnapshot(data: Data) {
    const {
      selectedIds,
      document: { pages },
      currentPageId,
    } = current(data)

    const currentlySelected = new Set(selectedIds)

    return {
      selectedIds: [...data.selectedIds],
      shapes: Object.values(pages[currentPageId].shapes)
        .filter((shape) => !currentlySelected.has(shape.id))
        .map((shape) => {
          switch (shape.type) {
            case ShapeType.Dot: {
              return {
                shape,
                bounds: shapeUtils[shape.type].getBounds(shape),
              }
            }
            case ShapeType.Circle: {
              return {
                shape,
                bounds: shapeUtils[shape.type].getBounds(shape),
              }
            }
            case ShapeType.Rectangle: {
              return {
                shape,
                bounds: shapeUtils[shape.type].getBounds(shape),
              }
            }
            default: {
              return undefined
            }
          }
        })
        .filter(Boolean),
    }
  }
}

/**
 * Get whether two bounds collide.
 * @param a Bounds
 * @param b Bounds
 * @returns
 */
export function boundsCollide(a: Bounds, b: Bounds) {
  return !(
    a.maxX < b.minX ||
    a.minX > b.maxX ||
    a.maxY < b.minY ||
    a.minY > b.maxY
  )
}

/**
 * Get whether the bounds of A contain the bounds of B. A perfect match will return true.
 * @param a Bounds
 * @param b Bounds
 * @returns
 */
export function boundsContain(a: Bounds, b: Bounds) {
  return (
    a.minX < b.minX && a.minY < b.minY && a.maxY > b.maxY && a.maxX > b.maxX
  )
}

/**
 * Get whether the bounds of A are contained by the bounds of B.
 * @param a Bounds
 * @param b Bounds
 * @returns
 */
export function boundsContained(a: Bounds, b: Bounds) {
  return boundsContain(b, a)
}

/**
 * Get whether two bounds are identical.
 * @param a Bounds
 * @param b Bounds
 * @returns
 */
export function boundsAreEqual(a: Bounds, b: Bounds) {
  return !(
    b.maxX !== a.maxX ||
    b.minX !== a.minX ||
    b.maxY !== a.maxY ||
    b.minY !== a.minY
  )
}

/**
 * Get whether a point is inside of a bounds.
 * @param A
 * @param b
 * @returns
 */
export function pointInBounds(A: number[], b: Bounds) {
  return !(A[0] < b.minX || A[0] > b.maxX || A[1] < b.minY || A[1] > b.maxY)
}
