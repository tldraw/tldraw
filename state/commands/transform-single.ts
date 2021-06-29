import Command from './command'
import history from '../history'
import { Data } from 'types'
import { current } from 'immer'
import { TransformSingleSnapshot } from 'state/sessions/transform-single-session'
import tld from 'utils/tld'

export default function transformSingleCommand(
  data: Data,
  before: TransformSingleSnapshot,
  after: TransformSingleSnapshot,
  isCreating: boolean
): void {
  const shape = current(tld.getPage(data).shapes[after.id])

  history.execute(
    data,
    new Command({
      name: 'transform_single_shape',
      category: 'canvas',
      manualSelection: true,
      do(data) {
        const { id } = after

        const { shapes } = tld.getPage(data)

        tld.setSelectedIds(data, [id])

        shapes[id] = shape

        tld.updateParents(data, [id])
      },
      undo(data) {
        const { id, initialShape } = before

        const { shapes } = tld.getPage(data)

        if (isCreating) {
          tld.setSelectedIds(data, [])
          delete shapes[id]
        } else {
          const page = tld.getPage(data)
          page.shapes[id] = initialShape
          tld.updateParents(data, [id])
          tld.setSelectedIds(data, [id])
        }
      },
    })
  )
}
