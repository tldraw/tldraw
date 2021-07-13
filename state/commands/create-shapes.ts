import Command from './command'
import history from '../history'
import { Data, Shape } from 'types'
import tld from 'utils/tld'
import { deepClone } from 'utils'

// Used when creating new shapes.

export default function createShapesCommand(
  data: Data,
  shapes: Shape[],
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
        data.hoveredId = undefined
        data.currentParentId = undefined
      },
      undo(data) {
        tld.deleteShapes(data, shapeIds)
        tld.setSelectedIds(data, [])
        data.hoveredId = undefined
        data.currentParentId = undefined
      },
    })
  )
}
