import Command from './command'
import history from '../history'
import { Data, Page } from 'types'
import { deepClone, uniqueId } from 'utils/utils'
import tld from 'utils/tld'
import storage from 'state/storage'
import { getShapeUtils } from 'state/shape-utils'

export default function duplicatePage(
  data: Data,
  id: string,
  goToPage = true
): void {
  const snapshot = getSnapshot(data, id)

  history.execute(
    data,
    new Command({
      name: 'duplicate_page',
      category: 'canvas',
      do(data) {
        const { from, to } = snapshot

        data.document.pages[to.pageId] = to.page
        data.pageStates[to.pageId] = to.pageState

        storage.savePage(data, data.document.id, to.pageId)

        if (goToPage) {
          storage.savePage(data, data.document.id, from.pageId)
          storage.loadPage(data, data.document.id, to.pageId)
          data.currentPageId = to.pageId
          data.currentParentId = to.pageId

          tld.setZoomCSS(tld.getPageState(data).camera.zoom)
        }

        storage.saveAppStateToLocalStorage(data)
        storage.saveDocumentToLocalStorage(data)
      },
      undo(data) {
        const { from, to } = snapshot
        delete data.document.pages[to.pageId]
        delete data.pageStates[to.pageId]

        if (goToPage) {
          storage.loadPage(data, data.document.id, from.pageId)
          data.currentPageId = from.pageId
          data.currentParentId = from.pageId

          tld.setZoomCSS(tld.getPageState(data).camera.zoom)
        }

        storage.saveAppStateToLocalStorage(data)
        storage.saveDocumentToLocalStorage(data)
      },
    })
  )
}

function getSnapshot(data: Data, id: string) {
  const { currentPageId } = data

  const oldPage: Page =
    id === currentPageId
      ? data.document.pages[id]
      : storage.getPageFromLocalStorage(data, data.document.id, id)

  const newPage: Page = deepClone(oldPage)

  newPage.id = uniqueId()

  // Iterate the page's name
  const lastNameChar = oldPage.name[oldPage.name.length - 1]

  if (Number.isNaN(Number(lastNameChar))) {
    newPage.name = `${oldPage.name} 1`
  } else {
    newPage.name = `${oldPage.name.slice(0, -1)}${Number(lastNameChar) + 1}`
  }

  Object.values(newPage.shapes).forEach((shape) => {
    if (shape.parentId === oldPage.id) {
      getShapeUtils(shape).setProperty(shape, 'parentId', newPage.id)
    }
  })

  const oldPageState =
    id === currentPageId
      ? data.pageStates[id]
      : storage.getPageStateFromLocalStorage(data, data.document.id, id)

  const newPageState = deepClone(oldPageState)

  newPageState.id = newPage.id

  return {
    currentPageId,
    from: {
      pageId: currentPageId,
      pageState: deepClone(data.pageStates[currentPageId]),
    },
    to: {
      pageId: newPage.id,
      page: newPage,
      pageState: newPageState,
    },
  }
}
