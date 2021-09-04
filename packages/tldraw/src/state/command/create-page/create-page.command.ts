import type { Data, TLDrawCommand, TLDrawPage } from '~types'
import { Utils, TLPageState } from '@tldraw/core'

export function createPage(data: Data, pageId = Utils.uniqueId()): TLDrawCommand {
  const { currentPageId } = data.appState

  const topPage = Object.values(data.document.pages).sort(
    (a, b) => (b.childIndex || 0) - (a.childIndex || 0)
  )[0]

  const nextChildIndex = topPage?.childIndex ? topPage?.childIndex + 1 : 1

  // TODO: Iterate the name better
  const nextName = `Page ${nextChildIndex}`

  const page: TLDrawPage = {
    id: pageId,
    name: nextName,
    shapes: {},
    childIndex: nextChildIndex,
    bindings: {},
  }

  const pageState: TLPageState = {
    id: pageId,
    selectedIds: [],
    camera: { point: [-window.innerWidth / 2, -window.innerHeight / 2], zoom: 1 },
    currentParentId: pageId,
    editingId: undefined,
    bindingId: undefined,
    hoveredId: undefined,
    pointedId: undefined,
  }

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
        currentPageId: page.id,
      },
      document: {
        pages: {
          [pageId]: page,
        },
        pageStates: {
          [pageId]: pageState,
        },
      },
    },
  }
}
