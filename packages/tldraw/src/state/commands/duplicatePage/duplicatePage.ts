import { Utils } from '@tldraw/core'
import type { TldrawApp } from '~state/TldrawApp'
import type { TldrawCommand } from '~types'

export function duplicatePage(app: TldrawApp, pageId: string): TldrawCommand {
  const {
    currentPageId,
    pageState: { camera },
  } = app

  const page = app.document.pages[pageId]

  const newId = Utils.uniqueId()

  // Map shapes and bindings onto new IDs
  const oldToNewIds: Record<string, string> = Object.fromEntries([
    [page.id, newId],
    ...Object.keys(page.shapes).map((id) => [id, Utils.uniqueId()]),
    ...Object.keys(page.bindings).map((id) => [id, Utils.uniqueId()]),
  ])

  const shapes = Object.fromEntries(
    Object.entries(page.shapes).map(([id, shape]) => [
      oldToNewIds[id],
      {
        ...Utils.deepClone(shape),
        id: oldToNewIds[id],
        parentId: oldToNewIds[shape.parentId],
      },
    ])
  )

  const bindings = Object.fromEntries(
    Object.entries(page.bindings).map(([id, binding]) => [
      oldToNewIds[id],
      {
        ...Utils.deepClone(binding),
        id: oldToNewIds[binding.id],
        fromId: oldToNewIds[binding.fromId],
        toId: oldToNewIds[binding.toId],
      },
    ])
  )

  // Update the shape's to and from references to the new bindingid
  Object.values(page.bindings).forEach((binding) => {
    const fromId = oldToNewIds[binding.fromId]
    const fromHandles = shapes[fromId]!.handles

    if (fromHandles) {
      Object.values(fromHandles).forEach((handle) => {
        if (handle!.bindingId === binding.id) {
          handle!.bindingId = oldToNewIds[binding.id]
        }
      })
    }

    const toId = oldToNewIds[binding.toId]
    const toHandles = shapes[toId]!.handles

    if (toHandles) {
      Object.values(toHandles).forEach((handle) => {
        if (handle!.bindingId === binding.id) {
          handle!.bindingId = oldToNewIds[binding.id]
        }
      })
    }
  })

  const nextPage = {
    ...page,
    id: oldToNewIds[page.id],
    name: page.name + ' Copy',
    shapes,
    bindings,
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
