import Command from './command'
import history from '../history'
import { Data } from 'types'
import { uniqueArray } from 'utils'
import tld from 'utils/tld'
import { getShapeUtils } from 'state/shape-utils'
import storage from 'state/storage'

export default function moveToPageCommand(data: Data, newPageId: string): void {
  const { currentPageId: oldPageId } = data
  const oldPage = tld.getPage(data)
  const selectedIds = [...tld.getSelectedIds(data)]

  const idsToMove = uniqueArray(
    ...selectedIds.flatMap((id) => tld.getDocumentBranch(data, id))
  )

  const oldParentIds = Object.fromEntries(
    idsToMove.map((id) => [id, oldPage.shapes[id].parentId])
  )

  // const selectedParents = uniqueArray(
  //   ...selectedIds.map((id) => getTopParentId(data, id))
  // )

  history.execute(
    data,
    new Command({
      name: 'move_to_page',
      category: 'canvas',
      manualSelection: true,
      do(data) {
        const fromPageId = oldPageId
        const toPageId = newPageId

        const fromPage = tld.getPage(data)

        // Get all of the selected shapes and their descendents
        const shapesToMove = idsToMove.map((id) => fromPage.shapes[id])

        shapesToMove.forEach((shape) => {
          // If the shape is a parent of a group that isn't selected,
          // remove the shape's id from its parent's children.
          if (
            shape.parentId !== fromPageId &&
            !idsToMove.includes(shape.parentId)
          ) {
            const parent = fromPage.shapes[shape.parentId]

            getShapeUtils(parent).setProperty(
              parent,
              'children',
              parent.children.filter((id) => id !== shape.id)
            )
          }

          // Delete the shapes from the "from" page
          delete fromPage.shapes[shape.id]
        })

        // Clear the current page state's selected ids
        tld.setSelectedIds(data, [])

        // Save the "from" page
        storage.savePage(data, data.document.id, fromPageId)

        // Load the "to" page
        storage.loadPage(data, toPageId)

        // The page we're moving the shapes to
        const toPage = tld.getPage(data)

        // Add all of the selected shapes to the "from" page.
        shapesToMove.forEach((shape) => {
          toPage.shapes[shape.id] = shape
        })

        // If a shape's parent isn't in the document, re-parent to the page.
        shapesToMove.forEach((shape) => {
          if (!toPage.shapes[shape.parentId]) {
            getShapeUtils(shape).setProperty(shape, 'parentId', toPageId)
          }
        })

        // Select the selected ids on the new page
        tld.setSelectedIds(data, [...selectedIds])

        // Move to the new page
        data.currentPageId = toPageId
      },
      undo(data) {
        const fromPageId = newPageId
        const toPageId = oldPageId

        const fromPage = tld.getPage(data)

        const shapesToMove = idsToMove.map((id) => fromPage.shapes[id])

        shapesToMove.forEach((shape) => {
          if (
            shape.parentId !== fromPageId &&
            !idsToMove.includes(shape.parentId)
          ) {
            const parent = fromPage.shapes[shape.parentId]

            getShapeUtils(parent).setProperty(
              parent,
              'children',
              parent.children.filter((id) => id !== shape.id)
            )
          }

          delete fromPage.shapes[shape.id]
        })

        tld.setSelectedIds(data, [])

        storage.savePage(data, data.document.id, fromPageId)

        storage.loadPage(data, toPageId)

        const toPage = tld.getPage(data)

        shapesToMove.forEach((shape) => {
          toPage.shapes[shape.id] = shape

          // Move shapes back to their old parent
          const parentId = oldParentIds[shape.id]
          getShapeUtils(shape).setProperty(shape, 'parentId', parentId)

          // And add the shape back to the parent's children
          if (parentId !== toPageId) {
            const parent = toPage.shapes[parentId]
            getShapeUtils(parent).setProperty(parent, 'children', [
              ...parent.children,
              shape.id,
            ])
          }
        })

        tld.setSelectedIds(data, [...selectedIds])

        data.currentPageId = toPageId
      },
    })
  )
}
