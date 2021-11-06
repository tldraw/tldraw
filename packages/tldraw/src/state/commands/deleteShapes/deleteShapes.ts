import { TLDR } from '~state/TLDR'
import type { Data, TLDrawCommand } from '~types'
import { removeShapesFromPage } from '../shared/removeShapesFromPage'

export function deleteShapes(
  data: Data,
  ids: string[],
  pageId = data.appState.currentPageId
): TLDrawCommand {
  const { before, after } = removeShapesFromPage(data, ids, pageId)

  return {
    id: 'delete',
    before: {
      document: {
        pages: {
          [pageId]: before,
        },
        pageStates: {
          [pageId]: { selectedIds: TLDR.getSelectedIds(data, pageId) },
        },
      },
    },
    after: {
      document: {
        pages: {
          [pageId]: after,
        },
        pageStates: {
          [pageId]: { selectedIds: [] },
        },
      },
    },
  }
}
