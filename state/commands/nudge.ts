import Command from './command'
import history from '../history'
import { Data } from 'types'
import { getPage, getSelectedShapes } from 'utils'
import { getShapeUtils } from 'state/shape-utils'
import vec from 'utils/vec'

export default function nudgeCommand(data: Data, delta: number[]): void {
  const selectedShapes = getSelectedShapes(data)
  const shapeBounds = Object.fromEntries(
    selectedShapes.map(
      (shape) => [shape.id, getShapeUtils(shape).getBounds(shape)] as const
    )
  )

  history.execute(
    data,
    new Command({
      name: 'nudge_shapes',
      category: 'canvas',
      do(data) {
        const { shapes } = getPage(data)

        for (const id in shapeBounds) {
          const shape = shapes[id]
          getShapeUtils(shape).setProperty(
            shape,
            'point',
            vec.add(shape.point, delta)
          )
        }
      },
      undo(data) {
        const { shapes } = getPage(data)

        for (const id in shapeBounds) {
          const shape = shapes[id]
          getShapeUtils(shape).setProperty(
            shape,
            'point',
            vec.sub(shape.point, delta)
          )
        }
      },
    })
  )
}
