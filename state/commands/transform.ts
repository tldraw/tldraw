import Command from './command'
import history from '../history'
import { Data } from 'types'
import { TransformSnapshot } from 'state/sessions/transform-session'
import { getPage, updateParents } from 'utils'

export default function transformCommand(
  data: Data,
  before: TransformSnapshot,
  after: TransformSnapshot
): void {
  history.execute(
    data,
    new Command({
      name: 'transform_shapes',
      category: 'canvas',
      do(data) {
        const { shapeBounds } = after

        const { shapes } = getPage(data)

        for (const id in shapeBounds) {
          shapes[id] = shapeBounds[id].initialShape
        }

        updateParents(data, Object.keys(shapeBounds))
      },
      undo(data) {
        const { shapeBounds } = before
        const { shapes } = getPage(data)

        for (const id in shapeBounds) {
          shapes[id] = shapeBounds[id].initialShape
        }

        updateParents(data, Object.keys(shapeBounds))
      },
    })
  )
}
