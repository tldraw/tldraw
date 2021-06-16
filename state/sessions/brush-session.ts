import { current } from 'immer'
import { Bounds, Data, ShapeType } from 'types'
import BaseSession from './base-session'
import { getShapeUtils } from 'lib/shape-utils'
import {
  getBoundsFromPoints,
  getPage,
  getPageState,
  getShapes,
  getTopParentId,
  setSelectedIds,
  setToArray,
} from 'utils/utils'
import vec from 'utils/vec'
import state from 'state/state'

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

    const hits = new Set<string>([])

    const selectedIds = new Set(snapshot.selectedIds)

    for (let id in snapshot.shapeHitTests) {
      if (selectedIds.has(id)) continue

      const { test, selectId } = snapshot.shapeHitTests[id]
      if (!hits.has(selectId)) {
        if (test(brushBounds)) {
          hits.add(selectId)

          // When brushing a shape, select its top group parent.
          if (!selectedIds.has(selectId)) {
            selectedIds.add(selectId)
          }
        } else if (selectedIds.has(selectId)) {
          selectedIds.delete(selectId)
        }
      }
    }

    getPageState(data).selectedIds = selectedIds

    data.brush = brushBounds
  }

  cancel = (data: Data) => {
    data.brush = undefined
    setSelectedIds(data, this.snapshot.selectedIds)
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
  const cData = current(data)
  const { selectedIds } = getPageState(cData)

  const shapesToTest = getShapes(cData)
    .filter((shape) => shape.type !== ShapeType.Group && !shape.isHidden)
    .filter(
      (shape) => !(selectedIds.has(shape.id) || selectedIds.has(shape.parentId))
    )

  return {
    selectedIds: setToArray(selectedIds),
    shapeHitTests: Object.fromEntries(
      shapesToTest.map((shape) => {
        return [
          shape.id,
          {
            selectId: getTopParentId(cData, shape.id),
            test: (bounds: Bounds) =>
              getShapeUtils(shape).hitTestBounds(shape, bounds),
          },
        ]
      })
    ),
  }
}

export type BrushSnapshot = ReturnType<typeof getBrushSnapshot>
