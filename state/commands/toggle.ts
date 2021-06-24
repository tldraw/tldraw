import Command from './command'
import history from '../history'
import { Data, Shape } from 'types'
import { getPage, getSelectedShapes } from 'utils'
import { getShapeUtils } from 'state/shape-utils'
import { PropsOfType } from 'types'

export default function toggleCommand(
  data: Data,
  prop: PropsOfType<Shape>
): void {
  const { currentPageId } = data
  const selectedShapes = getSelectedShapes(data)
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
        const { shapes } = getPage(data, currentPageId)

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
        const { shapes } = getPage(data, currentPageId)

        for (const id in initialShapes) {
          const shape = shapes[id]
          getShapeUtils(shape).setProperty(shape, prop, initialShapes[id])
        }
      },
    })
  )
}
