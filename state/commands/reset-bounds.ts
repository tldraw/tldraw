import Command from './command'
import history from '../history'
import { Data } from 'types'
import { getPage, getSelectedShapes, updateParents } from 'utils/utils'
import { current } from 'immer'
import { getShapeUtils } from 'lib/shape-utils'

export default function resetBoundsCommand(data: Data) {
  const initialShapes = Object.fromEntries(
    getSelectedShapes(current(data)).map((shape) => [shape.id, shape])
  )

  history.execute(
    data,
    new Command({
      name: 'reset_bounds',
      category: 'canvas',
      do(data) {
        getSelectedShapes(data).forEach((shape) => {
          getShapeUtils(shape).onBoundsReset(shape)
        })

        updateParents(data, Object.keys(initialShapes))
      },
      undo(data) {
        const page = getPage(data)
        getSelectedShapes(data).forEach((shape) => {
          page.shapes[shape.id] = initialShapes[shape.id]
        })

        updateParents(data, Object.keys(initialShapes))
      },
    })
  )
}
