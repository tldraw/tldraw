import type { Data, Command } from '~types'

export function deletePage(data: Data, pageId: string): Command {
  const { currentPageId } = data.appState

  const pagesArr = Object.values(data.document.pages).sort(
    (a, b) => (a.childIndex || 0) - (b.childIndex || 0)
  )

  const currentIndex = pagesArr.findIndex((page) => page.id === pageId)

  let nextCurrentPageId: string

  if (pageId === currentPageId) {
    if (currentIndex === pagesArr.length - 1) {
      nextCurrentPageId = pagesArr[pagesArr.length - 2].id
    } else {
      nextCurrentPageId = pagesArr[currentIndex + 1].id
    }
  } else {
    nextCurrentPageId = currentPageId
  }

  return {
    id: 'delete_page',
    before: {
      appState: {
        currentPageId: pageId,
      },
      document: {
        pages: {
          [pageId]: { ...data.document.pages[pageId] },
        },
        pageStates: {
          [pageId]: { ...data.document.pageStates[pageId] },
        },
      },
    },
    after: {
      appState: {
        currentPageId: nextCurrentPageId,
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
  }
}
