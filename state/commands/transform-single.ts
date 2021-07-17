import Command from './command'
import history from '../history'
import { Data } from 'types'
import { TransformSingleSnapshot } from 'state/sessions/transform-single-session'
import tld from 'utils/tld'
import { deepClone } from 'utils'

export default function transformSingleCommand(
  data: Data,
  before: TransformSingleSnapshot,
  after: TransformSingleSnapshot,
  isCreating: boolean
): void {
  const shape = deepClone(tld.getPage(data).shapes[after.id])
  const ids = [shape.id]

  history.execute(
    data,
    new Command({
      name: 'transform_single_shape',
      category: 'canvas',
      manualSelection: true,
      do(data) {
        const { id } = after

        const { shapes } = tld.getPage(data)

        shapes[id] = shape

        tld.setSelectedIds(data, [id])

        tld.updateBindings(data, ids)

        tld.updateParents(data, ids)
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

          tld.setSelectedIds(data, [id])

          tld.updateBindings(data, ids)

          tld.updateParents(data, ids)
        }
      },
    })
  )
}
