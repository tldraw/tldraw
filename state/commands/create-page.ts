import Command from './command'
import history from '../history'
import { Data, Page, PageState } from 'types'
import { uniqueId } from 'utils/utils'
import { current } from 'immer'
import storage from 'state/storage'

export default function createPage(data: Data, goToPage = true): void {
  const snapshot = getSnapshot(data)

  history.execute(
    data,
    new Command({
      name: 'create_page',
      category: 'canvas',
      do(data) {
        const { page, pageState, currentPageId } = snapshot
        data.document.pages[page.id] = page
        data.pageStates[page.id] = pageState

        data.currentPageId = page.id
        storage.savePage(data, data.document.id, page.id)
        storage.saveDocumentToLocalStorage(data)

        if (goToPage) {
          data.currentPageId = page.id
        } else {
          data.currentPageId = currentPageId
        }
      },
      undo(data) {
        const { page, currentPageId } = snapshot
        delete data.document.pages[page.id]
        delete data.pageStates[page.id]
        data.currentPageId = currentPageId
        storage.saveDocumentToLocalStorage(data)
      },
    })
  )
}

function getSnapshot(data: Data) {
  const { currentPageId } = current(data)

  const pages = Object.values(data.document.pages)
  const unchanged = pages.filter((page) => page.name.startsWith('Page '))
  const id = uniqueId()

  const page: Page = {
    type: 'page',
    id,
    name: `Page ${unchanged.length + 1}`,
    childIndex: pages.length,
    shapes: {},
  }

  const pageState: PageState = {
    id,
    selectedIds: new Set([]),
    camera: {
      point: [0, 0],
      zoom: 1,
    },
  }

  return {
    currentPageId,
    page,
    pageState,
  }
}
