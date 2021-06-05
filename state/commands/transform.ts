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
      name: 'translate_shapes',
      category: 'canvas',
      do(data, isInitial) {
        const { type, shapeBounds } = after

        const { shapes } = getPage(data)

        for (let id in shapeBounds) {
          const { initialShape, initialShapeBounds, transformOrigin } =
            shapeBounds[id]

          const shape = shapes[id]

          getShapeUtils(shape)
            .transform(shape, initialShapeBounds, {
              type,
              initialShape,
              transformOrigin,
              scaleX,
              scaleY,
            })
            .onSessionComplete(shape)
        }

        updateParents(data, Object.keys(shapeBounds))
      },
      undo(data) {
        const { type, shapeBounds } = before

        const { shapes } = getPage(data)

        for (let id in shapeBounds) {
          const { initialShape, initialShapeBounds, transformOrigin } =
            shapeBounds[id]
          const shape = shapes[id]

          getShapeUtils(shape)
            .transform(shape, initialShapeBounds, {
              type,
              initialShape,
              transformOrigin,
              scaleX: scaleX < 0 ? scaleX * -1 : scaleX,
              scaleY: scaleX < 0 ? scaleX * -1 : scaleX,
            })
            .onSessionComplete(shape)
        }

        updateParents(data, Object.keys(shapeBounds))
      },
    })
  )
}
