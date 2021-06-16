import Command from './command'
import history from '../history'
import { Data } from 'types'
import storage from 'state/storage'

export default function changePage(data: Data, toPageId: string) {
  const { currentPageId: fromPageId } = data

  history.execute(
    data,
    new Command({
      name: 'change_page',
      category: 'canvas',
      manualSelection: true,
      do(data) {
        storage.savePage(data, data.document.id, fromPageId)
        storage.loadPage(data, data.document.id, toPageId)
        data.currentPageId = toPageId
      },
      undo(data) {
        storage.loadPage(data, data.document.id, fromPageId)
        data.currentPageId = fromPageId
      },
    })
  )
}
