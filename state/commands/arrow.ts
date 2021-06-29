import Command from './command'
import history from '../history'
import { Data } from 'types'
import tld from 'utils/tld'
import { ArrowSnapshot } from 'state/sessions/arrow-session'

export default function arrowCommand(
  data: Data,
  before: ArrowSnapshot,
  after: ArrowSnapshot
): void {
  history.execute(
    data,
    new Command({
      name: 'point_arrow',
      category: 'canvas',
      manualSelection: true,
      do(data, isInitial) {
        if (isInitial) return

        const { initialShape } = after

        const page = tld.getPage(data)

        page.shapes[initialShape.id] = initialShape

        const selectedIds = tld.getSelectedIds(data)
        selectedIds.clear()
        selectedIds.add(initialShape.id)
        data.hoveredId = undefined
        data.pointedId = undefined
      },
      undo(data) {
        const { initialShape } = before
        const shapes = tld.getPage(data).shapes

        delete shapes[initialShape.id]

        const selectedIds = tld.getSelectedIds(data)
        selectedIds.clear()
        data.hoveredId = undefined
        data.pointedId = undefined
      },
    })
  )
}
