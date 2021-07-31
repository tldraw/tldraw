import { Utils, Vec } from '@tldraw/core'
import { Session } from '../../../state-types'
import { getShapeUtils } from '../../../../../shape'
import { Data } from '../../../state-types'
import { TLDR } from '../../../tldr'

export class BrushSession implements Session {
  id = 'brush'
  origin: number[]
  snapshot: BrushSnapshot

  constructor(data: Data, point: number[]) {
    this.origin = Vec.round(point)
    this.snapshot = getBrushSnapshot(data)
  }

  start(data: Data) {
    return data
  }

  update(data: Data, point: number[]) {
    const { snapshot, origin } = this

    // Create a bounding box between the origin and the new point
    const brush = Utils.getBoundsFromPoints([origin, point])

    // Find ids of brushed shapes
    const hits = new Set<string>()
    const selectedIds = new Set(snapshot.selectedIds)

    snapshot.shapesToTest.forEach(({ id, util, selectId }) => {
      if (selectedIds.has(id)) return
      if (hits.has(selectId)) return

      if (util.hitTestBounds(data.page.shapes[id], brush)) {
        hits.add(selectId)
        selectedIds.add(selectId)
      } else {
        selectedIds.delete(selectId)
      }
    })

    return {
      ...data,
      pageState: {
        ...data.pageState,
        brush,
        selectedIds: Array.from(selectedIds.values()),
      },
    }
  }

  cancel(data: Data) {
    return {
      ...data,
      pageState: {
        ...data.pageState,
        brush: undefined,
        selectedIds: this.snapshot.selectedIds,
      },
    }
  }

  complete(data: Data) {
    return {
      ...data,
      pageState: {
        ...data.pageState,
        brush: undefined,
      },
    }
  }
}

/**
 * Get a snapshot of the current selected ids, for each shape that is
 * not already selected, the shape's id and a test to see whether the
 * brush will intersect that shape. For tests, start broad -> fine.
 */
export function getBrushSnapshot(data: Data) {
  const selectedIds = [...data.pageState.selectedIds]

  const shapesToTest = TLDR.getShapes(data)
    .filter(
      (shape) =>
        !(
          shape.isHidden ||
          shape.children !== undefined ||
          selectedIds.includes(shape.id) ||
          selectedIds.includes(shape.parentId)
        ),
    )
    .map((shape) => ({
      id: shape.id,
      util: getShapeUtils(shape),
      bounds: getShapeUtils(shape).getBounds(shape),
      selectId: TLDR.getTopParentId(data, shape.id),
    }))

  return {
    selectedIds,
    shapesToTest,
  }
}

export type BrushSnapshot = ReturnType<typeof getBrushSnapshot>
