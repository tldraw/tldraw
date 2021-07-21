import Command from './command'
import history from '../history'
import { Data, Shape } from 'types'
import tld from 'utils/tld'
import { getShapeUtils } from 'state/shape-utils'
import { PropsOfType } from 'types'

/**
 * The toggle command toggles a boolean property on all selected shapes.
 * If the value is true for all selected shapes, then the property is
 * set to false; the value is false for one or more of the selected
 * shapes, then the value for all shapes is set to true.
 */
export default function toggleCommand(
  data: Data,
  prop: PropsOfType<Shape>
): void {
  const selectedShapes = tld.getSelectedShapes(data)
  const isAllToggled = selectedShapes.every((shape) => shape[prop])
  const initialShapes = selectedShapes.map((shape) => ({
    id: shape.id,
    value: shape[prop],
  }))

  history.execute(
    data,
    new Command({
      name: 'toggle_prop',
      category: 'canvas',
      do(data) {
        const { shapes } = tld.getPage(data)

        initialShapes.forEach(({ id }) => {
          const shape = shapes[id]
          getShapeUtils(shape).setProperty(
            shape,
            prop,
            isAllToggled ? false : true
          )
        })
      },
      undo(data) {
        const { shapes } = tld.getPage(data)

        initialShapes.forEach(({ id, value }) => {
          const shape = shapes[id]
          getShapeUtils(shape).setProperty(shape, prop, value)
        })
      },
    })
  )
}
