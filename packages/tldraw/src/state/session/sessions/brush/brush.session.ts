import { Utils, TLBounds } from '@tldraw/core'
import { Vec } from '@tldraw/vec'
import { Data, Session, SessionType, TLDrawPatch, TLDrawStatus } from '~types'
import { TLDR } from '~state/tldr'

export class BrushSession extends Session {
  static type = SessionType.Brush
  status = TLDrawStatus.Brushing
  origin: number[]
  snapshot: BrushSnapshot

  constructor(data: Data, viewport: TLBounds, point: number[]) {
    super(viewport)
    this.origin = Vec.round(point)
    this.snapshot = getBrushSnapshot(data)
  }

  start = () => void null

  update = (
    data: Data,
    point: number[],
    _shiftKey = false,
    _altKey = false,
    metaKey = false
  ): TLDrawPatch => {
    const { snapshot, origin } = this
    const { currentPageId } = data.appState

    // Create a bounding box between the origin and the new point
    const brush = Utils.getBoundsFromPoints([origin, point])

    // Find ids of brushed shapes
    const hits = new Set<string>()
    const selectedIds = new Set(snapshot.selectedIds)

    const page = TLDR.getPage(data, currentPageId)

    snapshot.shapesToTest.forEach(({ id, util, selectId }) => {
      if (selectedIds.has(id)) return

      const shape = page.shapes[id]

      if (!hits.has(selectId)) {
        if (
          metaKey
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

    const currentSelectedIds = data.document.pageStates[data.appState.currentPageId].selectedIds

    const didChange =
      selectedIds.size !== currentSelectedIds.length ||
      currentSelectedIds.some((id) => !selectedIds.has(id))

    const afterSelectedIds = didChange ? Array.from(selectedIds.values()) : currentSelectedIds

    return {
      document: {
        pageStates: {
          [currentPageId]: {
            brush,
            selectedIds: afterSelectedIds,
          },
        },
      },
    }
  }

  cancel = (data: Data) => {
    const { currentPageId } = data.appState
    return {
      document: {
        pageStates: {
          [currentPageId]: {
            brush: null,
            selectedIds: this.snapshot.selectedIds,
          },
        },
      },
    }
  }

  complete = (data: Data) => {
    const { currentPageId } = data.appState
    const pageState = TLDR.getPageState(data, currentPageId)

    return {
      document: {
        pageStates: {
          [currentPageId]: {
            brush: null,
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
      util: TLDR.getShapeUtils(shape),
      bounds: TLDR.getShapeUtils(shape).getBounds(shape),
      selectId: TLDR.getTopParentId(data, shape.id, currentPageId),
    }))

  return {
    selectedIds,
    shapesToTest,
  }
}

export type BrushSnapshot = ReturnType<typeof getBrushSnapshot>
