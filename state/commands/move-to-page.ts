import Command from './command'
import history from '../history'
import { Data } from 'types'
import {
  getDocumentBranch,
  getPage,
  getPageState,
  getSelectedIds,
  getSelectedShapes,
  getTopParentId,
  setToArray,
  uniqueArray,
} from 'utils/utils'
import { getShapeUtils } from 'lib/shape-utils'
import * as vec from 'utils/vec'
import storage from 'state/storage'

export default function nudgeCommand(data: Data, toPageId: string) {
  const { currentPageId: fromPageId } = data
  const selectedIds = setToArray(getSelectedIds(data))

  const selectedParents = uniqueArray(
    ...selectedIds.map((id) => getTopParentId(data, id))
  )

  history.execute(
    data,
    new Command({
      name: 'set_direction',
      category: 'canvas',
      manualSelection: true,
      do(data) {
        // The page we're moving the shapes from
        const fromPage = getPage(data, fromPageId)

        // Get all of the selected shapes and their descendents
        const shapesToMove = selectedParents.flatMap((id) =>
          getDocumentBranch(data, id).map((id) => fromPage.shapes[id])
        )

        // Delete the shapes from the "from" page
        shapesToMove.forEach((shape) => delete fromPage.shapes[shape.id])

        // Clear the current page state's selected ids
        getPageState(data, fromPageId).selectedIds.clear()

        // Save the "from" page
        storage.savePage(data, fromPageId)

        // Load the "to" page
        storage.loadPage(data, toPageId)

        // The page we're moving the shapes to
        const toPage = getPage(data, toPageId)

        // Add all of the selected shapes to the "from" page. Any shapes that
        // were children of the "from" page should become children of the "to"
        // page. Grouped shapes should keep their same parent.

        // What about shapes that were children of a group that we haven't moved?
        shapesToMove.forEach((shape) => {
          toPage.shapes[shape.id] = shape
          if (shape.parentId === fromPageId) {
            getShapeUtils(shape).setProperty(shape, 'parentId', toPageId)
          }
        })

        console.log('from', getPage(data, fromPageId))
        console.log('to', getPage(data, toPageId))

        // Select the selected ids on the new page
        getPageState(data, toPageId).selectedIds = new Set(selectedIds)

        // Move to the new page
        data.currentPageId = toPageId
      },
      undo(data) {
        const toPage = getPage(data, fromPageId)

        const shapesToMove = selectedParents.flatMap((id) =>
          getDocumentBranch(data, id).map((id) => toPage.shapes[id])
        )

        shapesToMove.forEach((shape) => delete toPage.shapes[shape.id])

        getPageState(data, toPageId).selectedIds.clear()

        storage.savePage(data, toPageId)

        storage.loadPage(data, fromPageId)

        const fromPage = getPage(data, toPageId)

        shapesToMove.forEach((shape) => {
          fromPage.shapes[shape.id] = shape
          if (shape.parentId === toPageId) {
            getShapeUtils(shape).setProperty(shape, 'parentId', fromPageId)
          }
        })

        getPageState(data, fromPageId).selectedIds = new Set(selectedIds)

        data.currentPageId = fromPageId
      },
    })
  )
}
