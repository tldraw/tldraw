import { Bounds, Data, ShapeType } from 'types'
import BaseSession from './base-session'
import { getShapeUtils } from 'state/shape-utils'
import { deepClone, getBoundsFromPoints } from 'utils'
import vec from 'utils/vec'
import tld from 'utils/tld'

export default class BrushSession extends BaseSession {
  origin: number[]
  snapshot: BrushSnapshot

  constructor(data: Data, point: number[]) {
    super(data)

    this.origin = vec.round(point)

    this.snapshot = getBrushSnapshot(data)
  }

  update = (data: Data, point: number[]): void => {
    const { origin, snapshot } = this

    const brushBounds = getBoundsFromPoints([origin, point])

    const hits = new Set<string>([])

    const selectedIds = [...snapshot.selectedIds]

    for (const id in snapshot.shapeHitTests) {
      if (selectedIds.includes(id)) continue

      const { test, selectId } = snapshot.shapeHitTests[id]
      if (!hits.has(selectId)) {
        if (test(brushBounds)) {
          hits.add(selectId)

          // When brushing a shape, select its top group parent.
          if (!selectedIds.includes(selectId)) {
            selectedIds.push(selectId)
          }
        } else if (selectedIds.includes(selectId)) {
          selectedIds.splice(selectedIds.indexOf(selectId), 1)
        }
      }
    }

    tld.getPageState(data).selectedIds = selectedIds

    data.brush = brushBounds
  }

  cancel = (data: Data): void => {
    data.brush = undefined
    tld.setSelectedIds(data, this.snapshot.selectedIds)
  }

  complete = (data: Data): void => {
    data.brush = undefined
  }
}

/**
 * Get a snapshot of the current selected ids, for each shape that is
 * not already selected, the shape's id and a test to see whether the
 * brush will intersect that shape. For tests, start broad -> fine.
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getBrushSnapshot(data: Data) {
  const cData = data
  const { selectedIds } = tld.getPageState(cData)

  const shapesToTest = tld
    .getShapes(cData)
    .filter((shape) => shape.type !== ShapeType.Group && !shape.isHidden)
    .filter(
      (shape) =>
        !(
          selectedIds.includes(shape.id) || selectedIds.includes(shape.parentId)
        )
    )
    .map(deepClone)

  return {
    selectedIds: [...selectedIds],
    shapeHitTests: Object.fromEntries(
      shapesToTest.map((shape) => {
        return [
          shape.id,
          {
            selectId: tld.getTopParentId(data, shape.id),
            test: (bounds: Bounds) => {
              return getShapeUtils(shape).hitTestBounds(shape, bounds)
            },
          },
        ]
      })
    ),
  }
}

export type BrushSnapshot = ReturnType<typeof getBrushSnapshot>
