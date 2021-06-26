import Command from './command'
import history from '../history'
import { Data, Shape } from 'types'
import {
  deepClone,
  getDocumentBranch,
  getPage,
  getSelectedShapes,
  setSelectedIds,
} from 'utils'
import { getShapeUtils } from 'state/shape-utils'

export default function deleteSelected(data: Data): void {
  const selectedShapes = getSelectedShapes(data)

  const selectedIdsArr = selectedShapes
    .filter((shape) => !shape.isLocked)
    .map((shape) => shape.id)

  const shapeIdsToDelete = selectedIdsArr.flatMap((id) =>
    getDocumentBranch(data, id)
  )

  const remainingIds = selectedShapes
    .filter((shape) => shape.isLocked)
    .map((shape) => shape.id)

  let deletedShapes: Shape[] = []

  history.execute(
    data,
    new Command({
      name: 'delete_selection',
      category: 'canvas',
      manualSelection: true,
      do(data) {
        // Update selected ids
        setSelectedIds(data, remainingIds)

        // Recursively delete shapes (and maybe their parents too)
        deletedShapes = deleteShapes(data, shapeIdsToDelete)
      },
      undo(data) {
        const page = getPage(data)

        // Update selected ids
        setSelectedIds(data, selectedIdsArr)

        // Restore deleted shapes
        deletedShapes.forEach((shape) => (page.shapes[shape.id] = shape))

        // Update parents
        deletedShapes.forEach((shape) => {
          if (shape.parentId === data.currentPageId) return

          const parent = page.shapes[shape.parentId]

          getShapeUtils(parent)
            .setProperty(parent, 'children', [...parent.children, shape.id])
            .onChildrenChange(
              parent,
              parent.children.map((id) => page.shapes[id])
            )
        })
      },
    })
  )
}

/** Recursively delete shapes and their parents */

function deleteShapes(
  data: Data,
  shapeIds: string[],
  shapesDeleted: Shape[] = []
): Shape[] {
  const parentsToDelete: string[] = []

  const page = getPage(data)

  const parentIds = new Set(shapeIds.map((id) => page.shapes[id].parentId))

  // Delete shapes
  shapeIds.forEach((id) => {
    shapesDeleted.push(deepClone(page.shapes[id]))
    delete page.shapes[id]
  })

  // Update parents
  parentIds.forEach((id) => {
    const parent = page.shapes[id]

    if (!parent || id === page.id) return

    getShapeUtils(parent)
      .setProperty(
        parent,
        'children',
        parent.children.filter((childId) => !shapeIds.includes(childId))
      )
      .onChildrenChange(
        parent,
        parent.children.map((id) => page.shapes[id])
      )

    if (getShapeUtils(parent).shouldDelete(parent)) {
      parentsToDelete.push(parent.id)
    }
  })

  if (parentsToDelete.length > 0) {
    return deleteShapes(data, parentsToDelete, shapesDeleted)
  }

  return shapesDeleted
}
