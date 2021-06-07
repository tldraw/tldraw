import Command from './command'
import history from '../history'
import { Data, Page, PageState } from 'types'
import { v4 as uuid } from 'uuid'
import { current } from 'immer'
import { getSelectedIds } from 'utils/utils'
import storage from 'state/storage'

export default function createPage(data: Data) {
  const snapshot = getSnapshot(data)

  history.execute(
    data,
    new Command({
      name: 'change_page',
      category: 'canvas',
      do(data) {
        const { page, pageState } = snapshot
        data.document.pages[page.id] = page
        data.pageStates[page.id] = pageState
        data.currentPageId = page.id
        storage.savePage(data, page.id)
      },
      undo(data) {
        const { page, currentPageId } = snapshot
        delete data.document.pages[page.id]
        delete data.pageStates[page.id]
        data.currentPageId = currentPageId
      },
    })
  )
}

function getSnapshot(data: Data) {
  const { currentPageId } = current(data)

  const pages = Object.values(data.document.pages)
  const unchanged = pages.filter((page) => page.name.startsWith('Page '))
  const id = uuid()

  const page: Page = {
    type: 'page',
    id,
    name: `Page ${unchanged.length + 1}`,
    childIndex: pages.length,
    shapes: {},
  }
  const pageState: PageState = {
    selectedIds: new Set<string>(),
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
