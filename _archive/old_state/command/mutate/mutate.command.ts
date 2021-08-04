import { TLDrawShape } from '../../../shape'
import { Data } from '../../../types'
import { TLD } from '../../tld'
import { Command } from '../command'

export function mutate(
  data: Data,
  before: Partial<TLDrawShape>[],
  after: Partial<TLDrawShape>[],
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

      after.forEach((props) => {
        const shape = data.page.shapes[props.id]
        if (!shape) {
          data.page.shapes[props.id] = { ...props } as TLDrawShape
          TLD.updateBindings(data, [props.id])
          TLD.updateParents(data, [props.id])
        } else {
          TLD.onSessionComplete(data, TLD.mutate(data, shape, props))
        }
      })

      TLD.setSelectedIds(
        data,
        after.map((shape) => shape.id),
      )
    },
    undo(data) {
      if (idsToDeleteOnUndo.length > 0) {
        TLD.deleteShapes(data, idsToDeleteOnUndo)
      }

      before.forEach((props) => {
        const shape = data.page.shapes[props.id]

        if (!shape) {
          data.page.shapes[props.id] = { ...props } as TLDrawShape
          TLD.updateBindings(data, [props.id])
          TLD.updateParents(data, [props.id])
        } else {
          TLD.onSessionComplete(data, TLD.mutate(data, shape, props))
        }
      })

      TLD.setSelectedIds(
        data,
        before.map((shape) => shape.id),
      )
    },
  })
}
