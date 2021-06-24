import Command from './command'
import history from '../history'
import { Data } from 'types'
import storage from 'state/storage'
import { deepClone, getPage, getPageState } from 'utils'

export default function deletePage(data: Data, pageId: string): void {
  const snapshot = getSnapshot(data, pageId)

  history.execute(
    data,
    new Command({
      name: 'delete_page',
      category: 'canvas',
      do(data) {
        data.currentPageId = snapshot.nextPageId
        delete data.document.pages[pageId]
        delete data.pageStates[pageId]
        storage.loadPage(data, snapshot.nextPageId)
      },
      undo(data) {
        data.currentPageId = snapshot.currentPageId
        data.document.pages[pageId] = snapshot.page
        data.pageStates[pageId] = snapshot.pageState
        storage.loadPage(data, snapshot.currentPageId)
      },
    })
  )
}

function getSnapshot(data: Data, pageId: string) {
  const { currentPageId, document } = data

  const page = deepClone(getPage(data))

  const pageState = deepClone(getPageState(data))

  const isCurrent = data.currentPageId === pageId

  const nextPageId = isCurrent
    ? Object.values(document.pages).filter((page) => page.id !== pageId)[0]?.id // TODO: should be at nextIndex
    : currentPageId

  return {
    nextPageId,
    isCurrent,
    currentPageId,
    page,
    pageState,
  }
}
