import type { Data, Command } from '~types'
import { Utils } from '@tldraw/core'

export function createPage(data: Data): Command {
  const newId = Utils.uniqueId()
  const { currentPageId } = data.appState

  return {
    id: 'create_page',
    before: {
      appState: {
        currentPageId,
      },
      document: {
        pages: {
          [newId]: undefined,
        },
        pageStates: {
          [newId]: undefined,
        },
      },
    },
    after: {
      appState: {
        currentPageId: newId,
      },
      document: {
        pages: {
          [newId]: { id: newId, shapes: {}, bindings: {} },
        },
        pageStates: {
          [newId]: {
            id: newId,
            selectedIds: [],
            camera: { point: [-window.innerWidth / 2, -window.innerHeight / 2], zoom: 1 },
            currentParentId: newId,
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
