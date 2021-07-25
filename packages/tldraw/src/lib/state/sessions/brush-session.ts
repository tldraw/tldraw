import { Utils, Vec } from '@tldraw/core'
import { BaseSession } from './base-session'
import { getShapeUtils } from '../../shapes'
import { TLDrawState } from '../state'
import { Data } from '../../types'

export default class BrushSession implements BaseSession {
  origin: number[]
  snapshot: BrushSnapshot

  constructor(state: TLDrawState, data: Data, point: number[]) {
    this.origin = Vec.round(point)
    this.snapshot = getBrushSnapshot(state, data)
  }

  update = (state: TLDrawState, data: Data, point: number[]): void => {
    const { origin, snapshot } = this

    const brushBounds = Utils.getBoundsFromPoints([origin, point])

    const hits = new Set<string>([])

    const selectedIds = [...snapshot.selectedIds]

    for (const { id, util, selectId } of snapshot.shapesToTest) {
      if (selectedIds.includes(id)) continue

      const shape = data.page.shapes[id]

      if (!hits.has(selectId)) {
        if (util.hitTestBounds(shape, brushBounds)) {
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

    data.pageState.selectedIds = selectedIds

    data.pageState.brush = brushBounds
  }

  cancel = (state: TLDrawState, data: Data): void => {
    data.pageState.brush = undefined
    state.setSelectedIds(data, this.snapshot.selectedIds)
  }

  complete = (state: TLDrawState, data: Data): void => {
    data.pageState.brush = undefined
  }
}

/**
 * Get a snapshot of the current selected ids, for each shape that is
 * not already selected, the shape's id and a test to see whether the
 * brush will intersect that shape. For tests, start broad -> fine.
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getBrushSnapshot(state: TLDrawState, data: Data) {
  const selectedIds = [...data.pageState.selectedIds]

  const shapesToTest = state
    .getShapes(data)
    .filter(
      (shape) =>
        !(
          shape.isHidden ||
          shape.children !== undefined ||
          selectedIds.includes(shape.id) ||
          selectedIds.includes(shape.parentId)
        )
    )
    .map((shape) => ({
      id: shape.id,
      util: getShapeUtils(shape),
      bounds: getShapeUtils(shape).getBounds(shape),
      selectId: state.getTopParentId(data, shape.id),
    }))

  return {
    selectedIds,
    shapesToTest,
  }
}

export type BrushSnapshot = ReturnType<typeof getBrushSnapshot>
