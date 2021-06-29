import Command from './command'
import history from '../history'
import { Data, Shape } from 'types'
import tld from 'utils/tld'
import { getShapeUtils } from 'state/shape-utils'
import { PropsOfType } from 'types'

export default function toggleCommand(
  data: Data,
  prop: PropsOfType<Shape>
): void {
  const selectedShapes = tld.getSelectedShapes(data)
  const isAllToggled = selectedShapes.every((shape) => shape[prop])
  const initialShapes = Object.fromEntries(
    selectedShapes.map((shape) => [shape.id, shape[prop]])
  )

  history.execute(
    data,
    new Command({
      name: 'toggle_prop',
      category: 'canvas',
      do(data) {
        const { shapes } = tld.getPage(data)

        for (const id in initialShapes) {
          const shape = shapes[id]
          getShapeUtils(shape).setProperty(
            shape,
            prop,
            isAllToggled ? false : true
          )
        }
      },
      undo(data) {
        const { shapes } = tld.getPage(data)

        for (const id in initialShapes) {
          const shape = shapes[id]
          getShapeUtils(shape).setProperty(shape, prop, initialShapes[id])
        }
      },
    })
  )
}
