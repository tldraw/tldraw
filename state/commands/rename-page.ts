import Command from './command'
import history from '../history'
import { Data, Page } from 'types'
import storage from 'state/storage'

export default function renamePage(
  data: Data,
  pageId: string,
  name: string
): void {
  const snapshot = getSnapshot(data, pageId)

  history.execute(
    data,
    new Command({
      name: 'rename_page',
      category: 'canvas',
      do(data) {
        if (pageId === data.currentPageId) {
          data.document.pages[pageId].name = name
        }

        storage.renamePageInLocalStorage(data, data.document.id, pageId, name)

        storage.saveAppStateToLocalStorage(data)
        storage.saveDocumentToLocalStorage(data)
      },
      undo(data) {
        if (pageId === data.currentPageId) {
          data.document.pages[pageId].name = snapshot.from.name
        }

        storage.renamePageInLocalStorage(
          data,
          data.document.id,
          pageId,
          snapshot.from.name
        )

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

  return {
    currentPageId,
    from: {
      pageId: oldPage.id,
      name: oldPage.name,
    },
    to: {
      pageId: oldPage.id,
    },
  }
}
