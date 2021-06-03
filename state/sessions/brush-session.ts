import { current } from 'immer'
import { Bounds, Data } from 'types'
import BaseSession from './base-session'
import { getShapeUtils } from 'lib/shape-utils'
import { getBoundsFromPoints, getShapes } from 'utils/utils'
import * as vec from 'utils/vec'

export default class BrushSession extends BaseSession {
  origin: number[]
  snapshot: BrushSnapshot

  constructor(data: Data, point: number[]) {
    super(data)

    this.origin = vec.round(point)

    this.snapshot = getBrushSnapshot(data)
  }

  update = (data: Data, point: number[]) => {
    const { origin, snapshot } = this

    const brushBounds = getBoundsFromPoints([origin, point])

    for (let id in snapshot.shapeHitTests) {
      const test = snapshot.shapeHitTests[id]
      if (test(brushBounds)) {
        if (!data.selectedIds.has(id)) {
          data.selectedIds.add(id)
        }
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
}

/**
 * Get a snapshot of the current selected ids, for each shape that is
 * not already selected, the shape's id and a test to see whether the
 * brush will intersect that shape. For tests, start broad -> fine.
 */
export function getBrushSnapshot(data: Data) {
  return {
    selectedIds: new Set(data.selectedIds),
    shapeHitTests: Object.fromEntries(
      getShapes(current(data)).map((shape) => [
        shape.id,
        (bounds: Bounds) => getShapeUtils(shape).hitTestBounds(shape, bounds),
      ])
    ),
  }
}

export type BrushSnapshot = ReturnType<typeof getBrushSnapshot>
