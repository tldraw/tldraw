import { current } from 'immer'
import { Bounds, Data, ShapeType } from 'types'
import BaseSession from './base-session'
import { getShapeUtils } from 'lib/shape-utils'
import { getBoundsFromPoints, getPage, getShapes } from 'utils/utils'
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
      const { test, selectId } = snapshot.shapeHitTests[id]
      if (test(brushBounds)) {
        // When brushing a shape, select its top group parent.
        if (!data.selectedIds.has(selectId)) {
          data.selectedIds.add(selectId)
        }

        // Possibly... select all of the top group parent's children too?
        // const selectedId = getTopParentId(data, id)
        // const idsToSelect = collectChildIds(data, selectedId)

        // for (let id in idsToSelect) {
        //   if (!data.selectedIds.has(id)) {
        //     data.selectedIds.add(id)
        //   }
        // }
      } else if (data.selectedIds.has(selectId)) {
        data.selectedIds.delete(selectId)
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
      getShapes(current(data))
        .filter((shape) => shape.type !== ShapeType.Group)
        .map((shape) => [
          shape.id,
          {
            selectId: getTopParentId(data, shape.id),
            test: (bounds: Bounds) =>
              getShapeUtils(shape).hitTestBounds(shape, bounds),
          },
        ])
    ),
  }
}

export type BrushSnapshot = ReturnType<typeof getBrushSnapshot>

function getTopParentId(data: Data, id: string): string {
  const shape = getPage(data).shapes[id]
  return shape.parentId === data.currentPageId ||
    shape.parentId === data.currentParentId
    ? id
    : getTopParentId(data, shape.parentId)
}

function collectChildIds(data: Data, id: string): string[] {
  const shape = getPage(data).shapes[id]

  if (shape.type === ShapeType.Group) {
    return [
      id,
      ...shape.children.flatMap((childId) => collectChildIds(data, childId)),
    ]
  }

  return [id]
}
