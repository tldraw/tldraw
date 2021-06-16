import Command from './command'
import history from '../history'
import { Data } from 'types'
import { getPage } from 'utils/utils'
import { HandleSnapshot } from 'state/sessions/handle-session'
import { getShapeUtils } from 'lib/shape-utils'
import vec from 'utils/vec'

export default function handleCommand(
  data: Data,
  before: HandleSnapshot,
  after: HandleSnapshot
) {
  history.execute(
    data,
    new Command({
      name: 'moved_handle',
      category: 'canvas',
      do(data, isInitial) {
        // if (isInitial) return

        const { initialShape, currentPageId } = after

        const page = getPage(data, currentPageId)
        const shape = page.shapes[initialShape.id]

        getShapeUtils(shape)
          .onHandleChange(shape, initialShape.handles)
          .onSessionComplete(shape)

        // const bounds = getShapeUtils(shape).getBounds(shape)

        // const offset = vec.sub([bounds.minX, bounds.minY], shape.point)

        // getShapeUtils(shape).translateTo(shape, vec.add(shape.point, offset))

        // const { start, end, bend } = page.shapes[initialShape.id].handles

        // start.point = vec.sub(start.point, offset)
        // end.point = vec.sub(end.point, offset)
        // bend.point = vec.sub(bend.point, offset)
      },
      undo(data) {
        const { initialShape, currentPageId } = before

        const page = getPage(data, currentPageId)
        page.shapes[initialShape.id] = initialShape
      },
    })
  )
}
