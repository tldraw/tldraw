import Command from './command'
import history from '../history'
import { TranslateSnapshot } from 'state/sessions/translate-session'
import { Data, ShapeType } from 'types'
import { getDocumentBranch, getPage, updateParents } from 'utils/utils'
import { current } from 'immer'
import { getShapeUtils } from 'lib/shape-utils'

export default function deleteSelected(data: Data) {
  const { currentPageId } = data

  const selectedIds = Array.from(data.selectedIds.values())

  const page = getPage(current(data))

  const childrenToDelete = selectedIds
    .flatMap((id) => getDocumentBranch(data, id))
    .map((id) => page.shapes[id])

  data.selectedIds.clear()

  history.execute(
    data,
    new Command({
      name: 'delete_shapes',
      category: 'canvas',
      manualSelection: true,
      do(data) {
        const page = getPage(data, currentPageId)

        for (let id of selectedIds) {
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

        data.selectedIds.clear()
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

        data.selectedIds = new Set(selectedIds)
      },
    })
  )
}
