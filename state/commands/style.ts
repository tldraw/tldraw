import Command from './command'
import history from '../history'
import { Data, ShapeStyles } from 'types'
import tld from 'utils/tld'
import { deepClone } from 'utils'
import { getShapeUtils } from 'state/shape-utils'

export default function styleCommand(
  data: Data,
  styles: Partial<ShapeStyles>
): void {
  const ids = tld.getSelectedIds(data)

  const page = tld.getPage(data)

  const selectedIds = [...tld.getSelectedIds(data)]

  const shapesToStyle = selectedIds
    .flatMap((id) => tld.getDocumentBranch(data, id))
    .map((id) => deepClone(page.shapes[id]))

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

        tld.updateBindings(data, ids)

        tld.updateParents(data, ids)
      },
      undo(data) {
        const { shapes } = tld.getPage(data)

        for (const { id, style } of shapesToStyle) {
          const shape = shapes[id]
          getShapeUtils(shape).applyStyles(shape, style)
        }

        tld.updateBindings(data, ids)

        tld.updateParents(data, ids)
      },
    })
  )
}
