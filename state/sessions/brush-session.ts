import { current } from "immer"
import { Bounds, Data, ShapeType } from "types"
import BaseSession from "./base-session"
import Shapes from "lib/shapes"
import { getBoundsFromPoints } from "utils/utils"
import * as vec from "utils/vec"
import {
  intersectCircleBounds,
  intersectPolylineBounds,
} from "utils/intersections"

interface BrushSnapshot {
  selectedIds: Set<string>
  shapes: { id: string; test: (bounds: Bounds) => boolean }[]
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

    for (let { test, id } of snapshot.shapes) {
      if (test(brushBounds)) {
        data.selectedIds.add(id)
      } else if (data.selectedIds.has(id)) {
        data.selectedIds.delete(id)
      }
    }

    data.brush = brushBounds
  }

  cancel = (data: Data) => {
    data.brush = undefined
    data.selectedIds = new Set(this.snapshot.selectedIds)
  }

  complete = (data: Data) => {
    data.brush = undefined
  }

  /**
   * Get a snapshot of the current selected ids, for each shape that is
   * not already selected, the shape's id and a test to see whether the
   * brush will intersect that shape. For tests, start broad -> fine.
   * @param data
   * @returns
   */
  static getSnapshot(data: Data): BrushSnapshot {
    const {
      selectedIds,
      document: { pages },
      currentPageId,
    } = current(data)

    return {
      selectedIds: new Set(data.selectedIds),
      shapes: Object.values(pages[currentPageId].shapes)
        .filter((shape) => !selectedIds.has(shape.id))
        .map((shape) => {
          switch (shape.type) {
            case ShapeType.Dot: {
              const bounds = Shapes[shape.type].getBounds(shape)

              return {
                id: shape.id,
                test: (brushBounds: Bounds) =>
                  boundsContained(bounds, brushBounds) ||
                  intersectCircleBounds(shape.point, 4, brushBounds).length > 0,
              }
            }
            case ShapeType.Circle: {
              const bounds = Shapes[shape.type].getBounds(shape)

              return {
                id: shape.id,
                test: (brushBounds: Bounds) =>
                  boundsContained(bounds, brushBounds) ||
                  intersectCircleBounds(
                    vec.addScalar(shape.point, shape.radius),
                    shape.radius,
                    brushBounds
                  ).length > 0,
              }
            }
            case ShapeType.Rectangle: {
              const bounds = Shapes[shape.type].getBounds(shape)

              return {
                id: shape.id,
                test: (brushBounds: Bounds) =>
                  boundsContained(bounds, brushBounds) ||
                  boundsCollide(bounds, brushBounds),
              }
            }
            case ShapeType.Polyline: {
              const bounds = Shapes[shape.type].getBounds(shape)
              const points = shape.points.map((point) =>
                vec.add(point, shape.point)
              )

              return {
                id: shape.id,
                test: (brushBounds: Bounds) =>
                  boundsContained(bounds, brushBounds) ||
                  (boundsCollide(bounds, brushBounds) &&
                    intersectPolylineBounds(points, brushBounds).length > 0),
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
