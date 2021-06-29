import Command from './command'
import history from '../history'
import { Data, ShapeStyles } from 'types'
import tld from 'utils/tld'
import { setToArray } from 'utils'
import { getShapeUtils } from 'state/shape-utils'
import { current } from 'immer'

export default function styleCommand(
  data: Data,
  styles: Partial<ShapeStyles>
): void {
  const cData = current(data)
  const page = tld.getPage(cData)

  const selectedIds = setToArray(tld.getSelectedIds(data))

  const shapesToStyle = selectedIds
    .flatMap((id) => tld.getDocumentBranch(data, id))
    .map((id) => page.shapes[id])

  history.execute(
    data,
    new Command({
      name: 'style_shapes',
      category: 'canvas',
      manualSelection: true,
      do(data) {
        const { shapes } = tld.getPage(data)

        for (const { id } of shapesToStyle) {
          const shape = shapes[id]
          getShapeUtils(shape).applyStyles(shape, styles)
        }
      },
      undo(data) {
        const { shapes } = tld.getPage(data)

        for (const { id, style } of shapesToStyle) {
          const shape = shapes[id]
          getShapeUtils(shape).applyStyles(shape, style)
        }
      },
    })
  )
}
