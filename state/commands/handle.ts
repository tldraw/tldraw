import Command from './command'
import history from '../history'
import { Data } from 'types'
import { getPage } from 'utils/utils'
import { HandleSnapshot } from 'state/sessions/handle-session'
import { getShapeUtils } from 'lib/shape-utils'

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
        if (isInitial) return

        const { initialShape, currentPageId } = after

        const shape = getPage(data, currentPageId).shapes[initialShape.id]

        getShapeUtils(shape).onHandleMove(shape, initialShape.handles)
      },
      undo(data) {
        const { initialShape, currentPageId } = before

        const shape = getPage(data, currentPageId).shapes[initialShape.id]

        getShapeUtils(shape).onHandleMove(shape, initialShape.handles)
      },
    })
  )
}
