import Command from './command'
import history from '../history'
import { Data } from 'types'
import { TransformSnapshot } from 'state/sessions/transform-session'
import { getShapeUtils } from 'lib/shape-utils'
import { getPage, updateParents } from 'utils/utils'

export default function transformCommand(
  data: Data,
  before: TransformSnapshot,
  after: TransformSnapshot,
  scaleX: number,
  scaleY: number
) {
  history.execute(
    data,
    new Command({
      name: 'transform_shapes',
      category: 'canvas',
      do(data) {
        const { shapeBounds } = after

        const { shapes } = getPage(data)

        for (let id in shapeBounds) {
          shapes[id] = shapeBounds[id].initialShape
        }

        updateParents(data, Object.keys(shapeBounds))
      },
      undo(data) {
        const { shapeBounds } = before
        const { shapes } = getPage(data)

        for (let id in shapeBounds) {
          shapes[id] = shapeBounds[id].initialShape
        }

        updateParents(data, Object.keys(shapeBounds))
      },
    })
  )
}
