import Command from './command'
import history from '../history'
import { Data, Shape } from 'types'
import tld from 'utils/tld'
import { deepClone } from 'utils'

// Used when creating new shapes.

export default function createShapesCommand(
  data: Data,
  shapes: Shape[],
  before: Shape[] = [],
  after: Shape[] = [],
  name = 'create_shapes'
): void {
  const snapshot = deepClone(shapes)
  const shapeIds = snapshot.map((shape) => shape.id)

  history.execute(
    data,
    new Command({
      name,
      category: 'canvas',
      manualSelection: true,
      do(data) {
        tld.createShapes(data, snapshot)
        tld.setSelectedIds(data, shapeIds)

        const page = tld.getPage(data)

        for (const shape of after) {
          page.shapes[shape.id] = shape
        }

        data.hoveredId = undefined
        data.currentParentId = undefined
      },
      undo(data) {
        tld.deleteShapes(data, shapeIds)
        tld.setSelectedIds(data, [])

        const page = tld.getPage(data)

        for (const shape of before) {
          page.shapes[shape.id] = shape
        }

        data.hoveredId = undefined
        data.currentParentId = undefined
      },
    })
  )
}
