import Command from './command'
import history from '../history'
import { Data } from 'types'
import { current } from 'immer'
import { getPage, getSelectedShapes } from 'utils/utils'
import { getShapeUtils } from 'lib/shape-utils'
import * as vec from 'utils/vec'

export default function changePage(data: Data, pageId: string) {
  const snapshot = getSnapshot(data, pageId)

  history.execute(
    data,
    new Command({
      name: 'change_page',
      category: 'canvas',
      do(data) {
        data.currentPageId = snapshot.nextPageId
        delete data.document.pages[pageId]
        delete data.pageStates[pageId]
      },
      undo(data) {
        data.currentPageId = snapshot.currentPageId
        data.document.pages[pageId] = snapshot.page
        data.pageStates[pageId] = snapshot.pageState
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

  const nextIndex = isCurrent
    ? page.childIndex === 0
      ? 1
      : page.childIndex - 1
    : document.pages[currentPageId].childIndex

  const nextPageId = isCurrent
    ? Object.values(document.pages).find(
        (page) => page.childIndex === nextIndex
      )!.id
    : cData.currentPageId

  return {
    nextPageId,
    isCurrent,
    currentPageId,
    page,
    pageState,
  }
}
