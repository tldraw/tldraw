import Command from './command'
import history from '../history'
import { Data } from 'types'
import { getPage, getSelectedIds } from 'utils/utils'
import { ArrowSnapshot } from 'state/sessions/arrow-session'

export default function arrowCommand(
  data: Data,
  before: ArrowSnapshot,
  after: ArrowSnapshot
) {
  history.execute(
    data,
    new Command({
      name: 'point_arrow',
      category: 'canvas',
      manualSelection: true,
      do(data, isInitial) {
        if (isInitial) return

        const { initialShape, currentPageId } = after

        const page = getPage(data, currentPageId)

        page.shapes[initialShape.id] = initialShape

        const selectedIds = getSelectedIds(data)
        selectedIds.clear()
        selectedIds.add(initialShape.id)
        data.hoveredId = undefined
        data.pointedId = undefined
      },
      undo(data) {
        const { initialShape, currentPageId } = before
        const shapes = getPage(data, currentPageId).shapes

        delete shapes[initialShape.id]

        const selectedIds = getSelectedIds(data)
        selectedIds.clear()
        data.hoveredId = undefined
        data.pointedId = undefined
      },
    })
  )
}
