import Command from './command'
import history from '../history'
import { Data } from 'types'
import { current } from 'immer'
import { TransformSingleSnapshot } from 'state/sessions/transform-single-session'
import { getPage, setSelectedIds, updateParents } from 'utils/utils'

export default function transformSingleCommand(
  data: Data,
  before: TransformSingleSnapshot,
  after: TransformSingleSnapshot,
  isCreating: boolean
): void {
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

        setSelectedIds(data, [id])

        shapes[id] = shape

        updateParents(data, [id])
      },
      undo(data) {
        const { id, initialShape } = before

        const { shapes } = getPage(data, before.currentPageId)

        if (isCreating) {
          setSelectedIds(data, [])
          delete shapes[id]
        } else {
          const page = getPage(data)
          page.shapes[id] = initialShape
          updateParents(data, [id])
          setSelectedIds(data, [id])
        }
      },
    })
  )
}
