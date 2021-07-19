import Command from './command'
import history from '../history'
import { Data, Shape, ShapeBinding } from 'types'
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
  let deleted: { shapes: Shape[]; bindings: ShapeBinding[] } = {
    shapes: [],
    bindings: [],
  }

  history.execute(
    data,
    new Command({
      name: 'delete_selection',
      category: 'canvas',
      manualSelection: true,
      do(data) {
        deleted = tld.deleteShapes(data, shapeIdsToDelete)

        tld.setSelectedIds(data, remainingIds)
      },
      undo(data) {
        tld.createShapes(data, deleted.shapes)
        tld.createBindings(data, deleted.bindings)
        tld.setSelectedIds(data, initialSelectedIds)
      },
    })
  )
}
