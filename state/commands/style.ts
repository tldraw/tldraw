import Command from './command'
import history from '../history'
import { Data, ShapeStyles } from 'types'
import { getPage, getSelectedShapes } from 'utils/utils'
import { getShapeUtils } from 'lib/shape-utils'
import { current } from 'immer'

export default function styleCommand(data: Data, styles: Partial<ShapeStyles>) {
  const { currentPageId } = data
  const initialShapes = getSelectedShapes(current(data))

  history.execute(
    data,
    new Command({
      name: 'changed_style',
      category: 'canvas',
      manualSelection: true,
      do(data) {
        const { shapes } = getPage(data, currentPageId)

        for (const { id } of initialShapes) {
          const shape = shapes[id]
          getShapeUtils(shape).applyStyles(shape, styles)
        }
      },
      undo(data) {
        const { shapes } = getPage(data, currentPageId)

        for (const { id, style } of initialShapes) {
          const shape = shapes[id]
          getShapeUtils(shape).applyStyles(shape, style)
        }
      },
    })
  )
}
