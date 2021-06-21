import Command from './command'
import history from '../history'
import { Data } from 'types'
import { getPage } from 'utils/utils'
import { HandleSnapshot } from 'state/sessions/handle-session'
import { getShapeUtils } from 'state/shape-utils'

export default function handleCommand(
  data: Data,
  before: HandleSnapshot,
  after: HandleSnapshot
): void {
  history.execute(
    data,
    new Command({
      name: 'moved_handle',
      category: 'canvas',
      do(data) {
        const { initialShape, currentPageId } = after

        const page = getPage(data, currentPageId)
        const shape = page.shapes[initialShape.id]

        getShapeUtils(shape)
          .onHandleChange(shape, initialShape.handles)
          .onSessionComplete(shape)
      },
      undo(data) {
        const { initialShape, currentPageId } = before

        const page = getPage(data, currentPageId)
        page.shapes[initialShape.id] = initialShape
      },
    })
  )
}
