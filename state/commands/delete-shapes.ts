import Command from './command'
import history from '../history'
import { Data, Shape } from 'types'
import tld from 'utils/tld'

export default function deleteShapes(data: Data, shapes: Shape[]): void {
  const initialSelectedIds = [...tld.getSelectedIds(data)]

  const shapeIdsToDelete = shapes.flatMap((shape) =>
    shape.isLocked ? [] : tld.getDocumentBranch(data, shape.id)
  )

  const remainingIds = initialSelectedIds.filter(
    (id) => !shapeIdsToDelete.includes(id)
  )

  // We're going to delete the shapes and their children, too; and possibly
  // their parents, if we delete all of a group shape's children.
  let deletedShapes: Shape[] = []

  history.execute(
    data,
    new Command({
      name: 'delete_selection',
      category: 'canvas',
      manualSelection: true,
      do(data) {
        deletedShapes = tld.deleteShapes(data, shapeIdsToDelete)
        tld.setSelectedIds(data, remainingIds)
      },
      undo(data) {
        tld.createShapes(data, deletedShapes)
        tld.setSelectedIds(data, initialSelectedIds)
      },
    })
  )
}
