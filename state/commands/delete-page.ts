import Command from './command'
import history from '../history'
import { Data } from 'types'
import storage from 'state/storage'
import { deepClone } from 'utils'
import tld from 'utils/tld'

export default function deletePage(data: Data, pageId: string): void {
  const snapshot = getSnapshot(data, pageId)

  history.execute(
    data,
    new Command({
      name: 'delete_page',
      category: 'canvas',
      do(data) {
        storage.saveAppStateToLocalStorage(data)
        storage.saveDocumentToLocalStorage(data)

        data.currentPageId = snapshot.nextPageId
        data.currentParentId = snapshot.nextPageId

        delete data.document.pages[pageId]
        delete data.pageStates[pageId]

        if (snapshot.isCurrent) {
          storage.loadPage(data, data.document.id, snapshot.nextPageId)
        }

        storage.saveAppStateToLocalStorage(data)
        storage.saveDocumentToLocalStorage(data)
      },
      undo(data) {
        storage.saveAppStateToLocalStorage(data)
        storage.saveDocumentToLocalStorage(data)

        data.currentPageId = snapshot.currentPageId
        data.currentParentId = snapshot.currentParentId
        data.document.pages[pageId] = snapshot.page
        data.pageStates[pageId] = snapshot.pageState

        if (snapshot.isCurrent) {
          storage.loadPage(data, data.document.id, snapshot.currentPageId)
        }

        storage.saveAppStateToLocalStorage(data)
        storage.saveDocumentToLocalStorage(data)
      },
    })
  )
}

function getSnapshot(data: Data, pageId: string) {
  const { currentPageId, currentParentId, document } = data

  const page = deepClone(tld.getPage(data))

  const pageState = deepClone(tld.getPageState(data))

  const isCurrent = data.currentPageId === pageId

  const pageIds = Object.keys(document.pages)

  const pageIndex = pageIds.indexOf(pageId)

  const nextPageId = isCurrent
    ? pageIndex === 0
      ? pageIds[1]
      : pageIndex === pageIds.length - 1
      ? pageIds[pageIndex - 1]
      : pageIds[pageIndex + 1]
    : currentPageId

  return {
    nextPageId,
    isCurrent,
    currentPageId,
    currentParentId,
    page,
    pageState,
  }
}
