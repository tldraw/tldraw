import { brushUpdater, Utils, Vec } from '@tldraw/core'
import { Data, Session, TLDrawStatus } from '~types'
import { getShapeUtils } from '~shape'
import { TLDR } from '~state/tldr'
import type { DeepPartial } from '~../../core/dist/types/utils/utils'

export class BrushSession implements Session {
  id = 'brush'
  status = TLDrawStatus.Brushing
  origin: number[]
  snapshot: BrushSnapshot

  constructor(data: Data, point: number[]) {
    this.origin = Vec.round(point)
    this.snapshot = getBrushSnapshot(data)
  }

  start = () => void null

  update = (data: Data, point: number[], containMode = false): DeepPartial<Data> => {
    const { snapshot, origin } = this
    const { currentPageId } = data.appState

    // Create a bounding box between the origin and the new point
    const brush = Utils.getBoundsFromPoints([origin, point])

    brushUpdater.set(brush)

    // Find ids of brushed shapes
    const hits = new Set<string>()
    const selectedIds = new Set(snapshot.selectedIds)

    const page = TLDR.getPage(data, currentPageId)
    const pageState = TLDR.getPageState(data, currentPageId)

    snapshot.shapesToTest.forEach(({ id, util, selectId }) => {
      if (selectedIds.has(id)) return

      const shape = page.shapes[id]

      if (!hits.has(selectId)) {
        if (
          containMode
            ? Utils.boundsContain(brush, util.getBounds(shape))
            : util.hitTestBounds(shape, brush)
        ) {
          hits.add(selectId)

          // When brushing a shape, select its top group parent.
          if (!selectedIds.has(selectId)) {
            selectedIds.add(selectId)
          }
        } else if (selectedIds.has(selectId)) {
          selectedIds.delete(selectId)
        }
      }
    })

    if (
      selectedIds.size === pageState.selectedIds.length &&
      pageState.selectedIds.every((id) => selectedIds.has(id))
    ) {
      return {}
    }

    return {
      document: {
        pageStates: {
          [currentPageId]: {
            selectedIds: Array.from(selectedIds.values()),
          },
        },
      },
    }
  }

  cancel(data: Data) {
    const { currentPageId } = data.appState
    return {
      document: {
        pageStates: {
          [currentPageId]: {
            selectedIds: this.snapshot.selectedIds,
          },
        },
      },
    }
  }

  complete(data: Data) {
    const { currentPageId } = data.appState
    const pageState = TLDR.getPageState(data, currentPageId)
    return {
      document: {
        pageStates: {
          [currentPageId]: {
            selectedIds: [...pageState.selectedIds],
          },
        },
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
  const { currentPageId } = data.appState
  const selectedIds = [...TLDR.getSelectedIds(data, currentPageId)]

  const shapesToTest = TLDR.getShapes(data, currentPageId)
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
      selectId: TLDR.getTopParentId(data, shape.id, currentPageId),
    }))

  return {
    selectedIds,
    shapesToTest,
  }
}

export type BrushSnapshot = ReturnType<typeof getBrushSnapshot>
