import Command from './command'
import history from '../history'
import { Data } from 'types'
import { current } from 'immer'
import vec from 'utils/vec'
import storage from 'state/storage'

export default function deletePage(data: Data, pageId: string) {
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
  const cData = current(data)
  const { currentPageId, document } = cData

  const page = document.pages[pageId]
  const pageState = cData.pageStates[pageId]

  const isCurrent = currentPageId === pageId

  // const nextIndex = isCurrent
  //   ? page.childIndex === 0
  //     ? 1
  //     : page.childIndex - 1
  //   : document.pages[currentPageId].childIndex

  const nextPageId = isCurrent
    ? Object.values(document.pages).filter((page) => page.id !== pageId)[0]?.id // TODO: should be at nextIndex
    : cData.currentPageId

  return {
    nextPageId,
    isCurrent,
    currentPageId,
    page,
    pageState,
  }
}
