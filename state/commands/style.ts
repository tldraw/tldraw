import Command from './command'
import history from '../history'
import { Data, ShapeStyles } from 'types'
import { getDocumentBranch, getPage, getSelectedShapes } from 'utils/utils'
import { getShapeUtils } from 'lib/shape-utils'
import { current } from 'immer'

export default function styleCommand(data: Data, styles: Partial<ShapeStyles>) {
  const cData = current(data)
  const page = getPage(cData)
  const { currentPageId } = cData

  const shapesToStyle = Array.from(data.selectedIds.values())
    .flatMap((id) => getDocumentBranch(data, id))
    .map((id) => page.shapes[id])

  history.execute(
    data,
    new Command({
      name: 'changed_style',
      category: 'canvas',
      manualSelection: true,
      do(data) {
        const { shapes } = getPage(data, currentPageId)

        for (const { id } of shapesToStyle) {
          const shape = shapes[id]
          getShapeUtils(shape).applyStyles(shape, styles)
        }
      },
      undo(data) {
        const { shapes } = getPage(data, currentPageId)

        for (const { id, style } of shapesToStyle) {
          const shape = shapes[id]
          getShapeUtils(shape).applyStyles(shape, style)
        }
      },
    })
  )
}
