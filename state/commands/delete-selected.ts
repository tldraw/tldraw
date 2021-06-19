import Command from './command'
import history from '../history'
import { TranslateSnapshot } from 'state/sessions/translate-session'
import { Data, ShapeType } from 'types'
import {
  getDocumentBranch,
  getPage,
  getPageState,
  getSelectedIds,
  getSelectedShapes,
  setSelectedIds,
  setToArray,
  updateParents,
} from 'utils/utils'
import { current } from 'immer'
import { getShapeUtils } from 'lib/shape-utils'

export default function deleteSelected(data: Data) {
  const { currentPageId } = data

  const selectedShapes = getSelectedShapes(data)

  const selectedIdsArr = selectedShapes
    .filter((shape) => !shape.isLocked)
    .map((shape) => shape.id)

  const page = getPage(current(data))

  const childrenToDelete = selectedIdsArr
    .flatMap((id) => getDocumentBranch(data, id))
    .map((id) => page.shapes[id])

  const remainingIds = selectedShapes
    .filter((shape) => shape.isLocked)
    .map((shape) => shape.id)

  history.execute(
    data,
    new Command({
      name: 'delete_selection',
      category: 'canvas',
      manualSelection: true,
      do(data) {
        const page = getPage(data, currentPageId)

        for (let id of selectedIdsArr) {
          const shape = page.shapes[id]
          if (!shape) {
            console.error('no shape ' + id)
            continue
          }

          if (shape.parentId !== data.currentPageId) {
            const parent = page.shapes[shape.parentId]
            getShapeUtils(parent)
              .setProperty(
                parent,
                'children',
                parent.children.filter((childId) => childId !== shape.id)
              )
              .onChildrenChange(
                parent,
                parent.children.map((id) => page.shapes[id])
              )
          }
        }

        for (let shape of childrenToDelete) {
          delete page.shapes[shape.id]
        }

        setSelectedIds(data, remainingIds)
      },
      undo(data) {
        const page = getPage(data, currentPageId)

        for (let shape of childrenToDelete) {
          page.shapes[shape.id] = shape
        }

        for (let shape of childrenToDelete) {
          if (shape.parentId !== data.currentPageId) {
            const parent = page.shapes[shape.parentId]
            getShapeUtils(parent)
              .setProperty(parent, 'children', [...parent.children, shape.id])
              .onChildrenChange(
                parent,
                parent.children.map((id) => page.shapes[id])
              )
          }
        }

        setSelectedIds(data, selectedIdsArr)
      },
    })
  )
}
