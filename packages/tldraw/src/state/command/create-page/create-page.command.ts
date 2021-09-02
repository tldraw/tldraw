import type { Data, TLDrawCommand } from '~types'
import { Utils } from '@tldraw/core'

export function createPage(data: Data, pageId = Utils.uniqueId()): TLDrawCommand {
  const { currentPageId } = data.appState

  return {
    id: 'create_page',
    before: {
      appState: {
        currentPageId,
      },
      document: {
        pages: {
          [pageId]: undefined,
        },
        pageStates: {
          [pageId]: undefined,
        },
      },
    },
    after: {
      appState: {
        currentPageId: pageId,
      },
      document: {
        pages: {
          [pageId]: { id: pageId, shapes: {}, bindings: {} },
        },
        pageStates: {
          [pageId]: {
            id: pageId,
            selectedIds: [],
            camera: { point: [-window.innerWidth / 2, -window.innerHeight / 2], zoom: 1 },
            currentParentId: pageId,
            editingId: undefined,
            bindingId: undefined,
            hoveredId: undefined,
            pointedId: undefined,
          },
        },
      },
    },
  }
}
