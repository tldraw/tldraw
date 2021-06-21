import Command from './command'
import history from '../history'
import { Data } from 'types'
import { getPage, getSelectedShapes, updateParents } from 'utils/utils'
import { current } from 'immer'
import { getShapeUtils } from 'state/shape-utils'

export default function resetBoundsCommand(data: Data): void {
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
          if (shape.isLocked) return
          getShapeUtils(shape).onBoundsReset(shape)
        })

        updateParents(data, Object.keys(initialShapes))
      },
      undo(data) {
        const page = getPage(data)
        getSelectedShapes(data).forEach((shape) => {
          if (shape.isLocked) return
          page.shapes[shape.id] = initialShapes[shape.id]
        })

        updateParents(data, Object.keys(initialShapes))
      },
    })
  )
}
