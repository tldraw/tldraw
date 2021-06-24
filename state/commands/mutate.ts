import Command from './command'
import history from '../history'
import { Data, Shape } from 'types'
import { getShapeUtils } from 'state/shape-utils'
import { getPage, updateParents } from 'utils'

// Used when changing the properties of one or more shapes,
// without changing selection or deleting any shapes.

export default function mutateShapesCommand(
  data: Data,
  before: Shape[],
  after: Shape[],
  name = 'mutate_shapes'
): void {
  history.execute(
    data,
    new Command({
      name,
      category: 'canvas',
      do(data) {
        const { shapes } = getPage(data)

        after.forEach((shape) => {
          shapes[shape.id] = shape
          getShapeUtils(shape).onSessionComplete(shape)
        })

        // updateParents(
        //   data,
        //   after.map((shape) => shape.id)
        // )
      },
      undo(data) {
        const { shapes } = getPage(data)

        before.forEach((shape) => {
          shapes[shape.id] = shape
          getShapeUtils(shape).onSessionComplete(shape)
        })

        updateParents(
          data,
          before.map((shape) => shape.id)
        )
      },
    })
  )
}
