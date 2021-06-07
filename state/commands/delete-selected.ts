import Command from './command'
import history from '../history'
import { TranslateSnapshot } from 'state/sessions/translate-session'
import { Data, ShapeType } from 'types'
import {
  getDocumentBranch,
  getPage,
  getSelectedIds,
  setSelectedIds,
  setToArray,
  updateParents,
} from 'utils/utils'
import { current } from 'immer'
import { getShapeUtils } from 'lib/shape-utils'

export default function deleteSelected(data: Data) {
  const { currentPageId } = data

  const selectedIds = getSelectedIds(data)
  const selectedIdsArr = setToArray(selectedIds)

  const page = getPage(current(data))

  const childrenToDelete = selectedIdsArr
    .flatMap((id) => getDocumentBranch(data, id))
    .map((id) => page.shapes[id])

  selectedIds.clear()

  history.execute(
    data,
    new Command({
      name: 'delete_shapes',
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

        setSelectedIds(data, [])
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
