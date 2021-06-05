import Command from './command'
import history from '../history'
import { Data, Corner, Edge } from 'types'
import { getShapeUtils } from 'lib/shape-utils'
import { current } from 'immer'
import { TransformSingleSnapshot } from 'state/sessions/transform-single-session'
import { getPage, updateParents } from 'utils/utils'

export default function transformSingleCommand(
  data: Data,
  before: TransformSingleSnapshot,
  after: TransformSingleSnapshot,
  isCreating: boolean
) {
  const shape = current(getPage(data, after.currentPageId).shapes[after.id])

  history.execute(
    data,
    new Command({
      name: 'transform_single_shape',
      category: 'canvas',
      manualSelection: true,
      do(data) {
        const { id } = after

        const { shapes } = getPage(data, after.currentPageId)

        data.selectedIds.clear()
        data.selectedIds.add(id)

        shapes[id] = shape

        updateParents(data, [id])
      },
      undo(data) {
        const { id, initialShape } = before

        const { shapes } = getPage(data, before.currentPageId)

        if (isCreating) {
          data.selectedIds.clear()
          delete shapes[id]
        } else {
          const page = getPage(data)
          page.shapes[id] = initialShape
          updateParents(data, [id])
          data.selectedIds = new Set([id])
        }
      },
    })
  )
}
