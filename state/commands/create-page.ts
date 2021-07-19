import Command from './command'
import history from '../history'
import { Data, Page, PageState } from 'types'
import { uniqueId } from 'utils/utils'
import tld from 'utils/tld'
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

        storage.savePage(data, data.document.id, currentPageId)

        data.document.pages[page.id] = page
        data.pageStates[page.id] = pageState

        storage.savePage(data, data.document.id, page.id)

        if (goToPage) {
          storage.loadPage(data, data.document.id, page.id)
          data.currentPageId = page.id
          data.currentParentId = page.id

          tld.setZoomCSS(tld.getPageState(data).camera.zoom)
        }

        storage.saveAppStateToLocalStorage(data)
        storage.saveDocumentToLocalStorage(data)
      },
      undo(data) {
        const { page, currentPageId } = snapshot
        delete data.document.pages[page.id]
        delete data.pageStates[page.id]

        if (goToPage) {
          storage.loadPage(data, data.document.id, currentPageId)
          data.currentPageId = currentPageId
          data.currentParentId = currentPageId

          tld.setZoomCSS(tld.getPageState(data).camera.zoom)
        }

        storage.saveAppStateToLocalStorage(data)
        storage.saveDocumentToLocalStorage(data)
      },
    })
  )
}

function getSnapshot(data: Data) {
  const { currentPageId } = data

  const pages = Object.values(data.document.pages)
  const unchanged = pages.filter((page) => page.name.startsWith('Page '))
  const id = uniqueId()

  const page: Page = {
    type: 'page',
    id,
    name: `Page ${unchanged.length + 1}`,
    childIndex: pages.length,
    shapes: {},
    bindings: {},
  }

  const pageState: PageState = {
    id,
    selectedIds: [],
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
