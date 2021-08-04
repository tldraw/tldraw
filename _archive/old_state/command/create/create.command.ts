import { TLDrawShape } from '../../../shape'
import { Data } from '../../../types'
import { TLD } from '../../tld'
import { Command } from '../command'

export function create(data: Data, shapes: TLDrawShape[], alreadyExist = false): Command {
  const selectedIds = [...TLD.getSelectedIds(data)]
  const ids = shapes.map((shape) => shape.id)

  return new Command({
    name: 'create_shapes',
    category: 'canvas',
    do(data, isFirstDo) {
      if (!alreadyExist || !isFirstDo) {
        // If shapes already exist in the document, then we only
        // have to create them on "redos". If the shapes don't exist,
        // then we'll create them on both "do" and "redo".
        TLD.createShapes(data, shapes)
      }

      TLD.setSelectedIds(data, ids)
      TLD.updateBindings(data, ids)
      TLD.updateParents(data, ids)
    },
    undo(data) {
      TLD.deleteShapes(data, ids)
      TLD.setSelectedIds(data, alreadyExist ? [] : selectedIds)
    },
  })
}
