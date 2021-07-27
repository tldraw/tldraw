// Used when changing the properties of one or more shapes,
// without changing selection or deleting any shapes.

import { getShapeUtils, TLDrawShape } from '../../../shape'
import { Data } from '../../../types'
import { TLD } from '../../tld'
import { Command } from '../command'

export function mutate(data: Data, before: TLDrawShape[], after: TLDrawShape[], name = 'mutate_shapes'): Command {
  const beforeIds = before.map((s) => s.id)
  const afterIds = new Set(after.map((s) => s.id))
  const idsToDeleteOnUndo = beforeIds.filter((id) => !afterIds.has(id))

  return new Command({
    name,
    category: 'canvas',
    do(data) {
      after.forEach((shape) => {
        data.page.shapes[shape.id] = shape
        getShapeUtils(shape).onSessionComplete(shape)
      })

      TLD.updateParents(
        data,
        after.map((shape) => shape.id),
      )

      // TODO: Update bindings
    },
    undo(data) {
      TLD.deleteShapes(data, idsToDeleteOnUndo)

      before.forEach((shape) => {
        data.page.shapes[shape.id] = shape
        getShapeUtils(shape).onSessionComplete(shape)
      })

      TLD.updateParents(
        data,
        before.map((shape) => shape.id),
      )

      // TODO: Update bindings
    },
  })
}
