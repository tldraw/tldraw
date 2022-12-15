import { Utils } from '@tldraw/core'
import type { TldrawApp } from '~state/TldrawApp'
import type { TldrawCommand } from '~types'

export function duplicatePage(app: TldrawApp, pageId: string): TldrawCommand {
  const {
    currentPageId,
    pageState: { camera },
  } = app

  const page = app.document.pages[pageId]
  const newIds = Object.fromEntries(
    Object.keys(page.shapes).map(id => [id, Utils.uniqueId()])
  )

  const nextPage = {
    ...page,
    id: newIds[page.id],
    name: page.name + ' Copy',
    shapes: Object.fromEntries(
      Object.entries(page.shapes).map(([id, shape]) => [
        newIds[id],
        {
          ...shape,
          id: newIds[id],
          parentId: newIds[shape.parentId],
        },
      ])
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
            camera: { ...camera },
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
