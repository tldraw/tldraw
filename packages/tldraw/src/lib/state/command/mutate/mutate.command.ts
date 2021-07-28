import { getShapeUtils, TLDrawShape } from '../../../shape'
import { Data } from '../../../types'
import { TLD } from '../../tld'
import { Command } from '../command'

export function mutate(
  data: Data,
  before: TLDrawShape[],
  after: TLDrawShape[],
  name = 'mutate_shapes',
): Command {
  const beforeIds = new Set(before.map((s) => s.id))
  const afterIds = new Set(after.map((s) => s.id))
  const idsToDeleteOnUndo = Array.from(afterIds.values()).filter((id) => !beforeIds.has(id))
  const idsToDeleteOnRedo = Array.from(beforeIds.values()).filter((id) => !afterIds.has(id))

  return new Command({
    name,
    category: 'canvas',
    do(data, isInitial) {
      if (!isInitial) {
        if (idsToDeleteOnRedo.length > 0) {
          TLD.deleteShapes(data, idsToDeleteOnRedo)
        }
      }

      after.forEach((shape) => {
        data.page.shapes[shape.id] = shape
        getShapeUtils(shape).onSessionComplete(shape)
      })

      const ids = after.map((shape) => shape.id)
      TLD.setSelectedIds(data, ids)
      TLD.updateBindings(data, ids)
      TLD.updateParents(data, ids)
    },
    undo(data) {
      if (idsToDeleteOnUndo.length > 0) {
        TLD.deleteShapes(data, idsToDeleteOnUndo)
      }

      before.forEach((shape) => {
        data.page.shapes[shape.id] = shape
        getShapeUtils(shape).onSessionComplete(shape)
      })

      const ids = before.map((shape) => shape.id)
      TLD.setSelectedIds(data, ids)
      TLD.updateBindings(data, ids)
      TLD.updateParents(data, ids)
    },
  })
}
