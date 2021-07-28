import { TLBinding, Utils } from '@tldraw/core'
import { TLDrawShape } from '../../../shape'
import { Data } from '../../../types'
import { TLD } from '../../tld'
import { Command } from '../command'

export function deleteShapes(data: Data) {
  const ids = [...TLD.getSelectedIds(data)]
  const initialShapes = ids.map((id) => Utils.deepClone(data.page.shapes[id]))

  const shapeIdsToDelete = initialShapes.flatMap((shape) =>
    shape.isLocked ? [] : TLD.getDocumentBranch(data, shape.id),
  )

  const remainingIds = ids.filter((id) => !shapeIdsToDelete.includes(id))

  let deleted: { shapes: TLDrawShape[]; bindings: TLBinding[] } = {
    shapes: [],
    bindings: [],
  }

  return new Command({
    name: 'delete_shapes',
    category: 'canvas',
    manualSelection: true,
    do(data) {
      deleted = TLD.deleteShapes(data, shapeIdsToDelete)
      TLD.setSelectedIds(data, remainingIds)
    },
    undo(data) {
      TLD.createShapes(data, deleted.shapes)
      TLD.createBindings(data, deleted.bindings)
      TLD.setSelectedIds(data, ids)
    },
  })
}
