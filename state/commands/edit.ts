import Command from './command'
import history from '../history'
import { Data } from 'types'
import { getPage, getShape } from 'utils/utils'
import { EditSnapshot } from 'state/sessions/edit-session'
import { getShapeUtils } from 'lib/shape-utils'

export default function handleCommand(
  data: Data,
  before: EditSnapshot,
  after: EditSnapshot
) {
  history.execute(
    data,
    new Command({
      name: 'edited_shape',
      category: 'canvas',
      do(data) {
        const { initialShape, currentPageId } = after

        const page = getPage(data, currentPageId)

        page.shapes[initialShape.id] = initialShape

        const shape = page.shapes[initialShape.id]

        if (getShapeUtils(shape).shouldDelete(shape)) {
          delete page.shapes[initialShape.id]
        }
      },
      undo(data) {
        const { initialShape, currentPageId } = before

        const page = getPage(data, currentPageId)

        page.shapes[initialShape.id] = initialShape
      },
    })
  )
}
