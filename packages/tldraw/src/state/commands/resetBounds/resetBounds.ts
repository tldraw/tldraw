import type { TLDrawSnapshot, TLDrawCommand } from '~types'
import { TLDR } from '~state/TLDR'

export function resetBounds(data: TLDrawSnapshot, ids: string[], pageId: string): TLDrawCommand {
  const { currentPageId } = data.appState

  const { before, after } = TLDR.mutateShapes(
    data,
    ids.filter((id) => !TLDR.getShape(data, id, currentPageId).isLocked),
    (shape) => TLDR.getShapeUtils(shape).onDoubleClickBoundsHandle?.(shape),
    pageId
  )

  return {
    id: 'reset_bounds',
    before: {
      document: {
        pages: {
          [data.appState.currentPageId]: { shapes: before },
        },
        pageStates: {
          [currentPageId]: {
            selectedIds: ids,
          },
        },
      },
    },
    after: {
      document: {
        pages: {
          [data.appState.currentPageId]: { shapes: after },
        },
        pageStates: {
          [currentPageId]: {
            selectedIds: ids,
          },
        },
      },
    },
  }
}
