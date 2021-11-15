import type { TLDrawCommand } from '~types'
import { TLDR } from '~state/TLDR'
import type { TLDrawApp } from '../../internal'

export function resetBounds(app: TLDrawApp, ids: string[], pageId: string): TLDrawCommand {
  const { currentPageId } = app

  const { before, after } = TLDR.mutateShapes(
    app.state,
    ids,
    (shape) => app.getShapeUtils(shape).onDoubleClickBoundsHandle?.(shape),
    pageId
  )

  return {
    id: 'reset_bounds',
    before: {
      document: {
        pages: {
          [currentPageId]: { shapes: before },
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
          [currentPageId]: { shapes: after },
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
