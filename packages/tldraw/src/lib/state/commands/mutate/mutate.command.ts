// Used when changing the properties of one or more shapes,
// without changing selection or deleting any shapes.

import { getShapeUtils, TLDrawShape } from '../../../shapes'
import { Data } from '../../../types'
import { state } from '../../state'
import { Command } from '../command'

export function mutate(
  data: Data,
  before: TLDrawShape[],
  after: TLDrawShape[],
  name = 'mutate_shapes'
): void {
  const beforeIds = before.map((s) => s.id)
  const afterIds = new Set(after.map((s) => s.id))
  const idsToDeleteOnUndo = beforeIds.filter((id) => !afterIds.has(id))

  const command = new Command({
    name,
    category: 'canvas',
    do(data) {
      after.forEach((shape) => {
        data.page.shapes[shape.id] = shape
        getShapeUtils(shape).onSessionComplete(shape)
      })

      state.updateParents(
        data,
        after.map((shape) => shape.id)
      )

      // TODO: Update bindings
    },
    undo(data) {
      state.deleteShapes(data, idsToDeleteOnUndo)

      before.forEach((shape) => {
        data.page.shapes[shape.id] = shape
        getShapeUtils(shape).onSessionComplete(shape)
      })

      state.updateParents(
        data,
        before.map((shape) => shape.id)
      )

      // TODO: Update bindings
    },
  })

  state.history.execute(data, command)
}
