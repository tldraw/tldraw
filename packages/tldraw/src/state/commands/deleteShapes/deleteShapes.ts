import type { TDAssets, TldrawCommand } from '~types'
import type { TldrawApp } from '../../internal'
import { removeShapesFromPage } from '../shared/removeShapesFromPage'

const removeAssetsFromDocument = (assets: TDAssets, idsToRemove: string[]) => {
  const updatedAssets = {} as TDAssets
  Object.entries(assets).forEach(([id, entry]) => {
    if (idsToRemove.includes(id)) {
      updatedAssets[id] = undefined!
    } else {
      updatedAssets[id] = entry
    }
  })
  return updatedAssets
}

export function deleteShapes(
  app: TldrawApp,
  ids: string[],
  pageId = app.currentPageId
): TldrawCommand {
  const {
    pageState,
    selectedIds,
    document: { assets: beforeAssets },
  } = app
  const { before, after, assetsToRemove } = removeShapesFromPage(app.state, ids, pageId)
  const afterAssets = removeAssetsFromDocument(beforeAssets, assetsToRemove)

  return {
    id: 'delete',
    before: {
      document: {
        assets: beforeAssets,
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
        assets: afterAssets,
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
