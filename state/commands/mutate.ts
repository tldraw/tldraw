import Command from './command'
import history from '../history'
import { Data, Shape } from 'types'
import { getShapeUtils } from 'state/shape-utils'
import tld from 'utils/tld'
import storage from 'state/storage'

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
        const { shapes } = tld.getPage(data)

        after.forEach((shape) => {
          shapes[shape.id] = shape
          getShapeUtils(shape).onSessionComplete(shape)
        })

        tld.updateParents(
          data,
          after.map((shape) => shape.id)
        )

        storage.savePage(data)
      },
      undo(data) {
        const { shapes } = tld.getPage(data)

        before.forEach((shape) => {
          shapes[shape.id] = shape
          getShapeUtils(shape).onSessionComplete(shape)
        })

        tld.updateParents(
          data,
          before.map((shape) => shape.id)
        )

        storage.savePage(data)
      },
    })
  )
}
