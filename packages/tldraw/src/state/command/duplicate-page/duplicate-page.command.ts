import type { Data, TLDrawCommand } from '~types'
import { Utils } from '@tldraw/core'

export function duplicatePage(data: Data, pageId: string): TLDrawCommand {
  const newId = Utils.uniqueId()
  const { currentPageId } = data.appState

  const page = data.document.pages[pageId]

  const nextPage = {
    ...page,
    id: newId,
    ...Object.fromEntries(
      Object.entries(page.shapes).map(([id, shape]) => {
        return [
          id,
          {
            ...shape,
            parentId: shape.parentId === pageId ? newId : shape.parentId,
          },
        ]
      })
    ),
  }

  return {
    id: 'duplicate_page',
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
          [newId]: nextPage,
        },
        pageStates: {
          [newId]: {
            ...page,
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
