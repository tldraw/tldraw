import type { TLDrawApp } from '../../internal'
import { TLDR } from '~state/TLDR'
import type { TLDrawCommand } from '~types'
import { removeShapesFromPage } from '../shared/removeShapesFromPage'

export function deleteShapes(
  app: TLDrawApp,
  ids: string[],
  pageId = app.currentPageId
): TLDrawCommand {
  const { pageState, selectedIds } = app
  const { before, after } = removeShapesFromPage(app.state, ids, pageId)

  return {
    id: 'delete',
    before: {
      document: {
        pages: {
          [pageId]: before,
        },
        pageStates: {
          [pageId]: { selectedIds: [...app.selectedIds] },
        },
      },
    },
    after: {
      document: {
        pages: {
          [pageId]: after,
        },
        pageStates: {
          [pageId]: {
            selectedIds: selectedIds.filter((id) => !ids.includes(id)),
            hoveredId:
              pageState.hoveredId && ids.includes(pageState.hoveredId)
                ? undefined
                : pageState.hoveredId,
          },
        },
      },
    },
  }
}
