import Command from './command'
import history from '../history'
import { Data } from 'types'
import { TransformSnapshot } from 'state/sessions/transform-session'
import tld from 'utils/tld'

export default function transformCommand(
  data: Data,
  before: TransformSnapshot,
  after: TransformSnapshot
): void {
  const ids = Object.keys(before.shapeBounds)

  history.execute(
    data,
    new Command({
      name: 'transform_shapes',
      category: 'canvas',
      do(data) {
        const { shapeBounds } = after

        const { shapes } = tld.getPage(data)

        for (const id of ids) {
          shapes[id] = shapeBounds[id].initialShape
        }

        tld.updateBindings(data, ids)

        tld.updateParents(data, ids)
      },
      undo(data) {
        const { shapeBounds } = before
        const { shapes } = tld.getPage(data)

        for (const id of ids) {
          shapes[id] = shapeBounds[id].initialShape
        }

        tld.updateBindings(data, ids)

        tld.updateParents(data, ids)
      },
    })
  )
}
