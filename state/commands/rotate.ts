import Command from './command'
import history from '../history'
import { Data } from 'types'
import { RotateSnapshot } from 'state/sessions/rotate-session'
import { getPage } from 'utils'
import { getShapeUtils } from 'state/shape-utils'

export default function rotateCommand(
  data: Data,
  before: RotateSnapshot,
  after: RotateSnapshot
): void {
  history.execute(
    data,
    new Command({
      name: 'rotate_shapes',
      category: 'canvas',
      do(data) {
        const { shapes } = getPage(data)

        for (const { id, point, rotation } of after.initialShapes) {
          const shape = shapes[id]
          getShapeUtils(shape)
            .rotateBy(shape, rotation - shape.rotation)
            .translateTo(shape, point)
            .onSessionComplete(shape)
        }

        data.boundsRotation = after.boundsRotation
      },
      undo(data) {
        const { shapes } = getPage(data, before.currentPageId)

        for (const { id, point, rotation } of before.initialShapes) {
          const shape = shapes[id]
          getShapeUtils(shape)
            .rotateBy(shape, rotation - shape.rotation)
            .translateTo(shape, point)
            .onSessionComplete(shape)
        }

        data.boundsRotation = before.boundsRotation
      },
    })
  )
}
