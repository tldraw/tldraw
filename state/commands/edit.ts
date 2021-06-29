import Command from './command'
import history from '../history'
import { Data } from 'types'
import tld from 'utils/tld'
import { EditSnapshot } from 'state/sessions/edit-session'
import { getShapeUtils } from 'state/shape-utils'

export default function editCommand(
  data: Data,
  before: EditSnapshot,
  after: EditSnapshot
): void {
  history.execute(
    data,
    new Command({
      name: 'edit_shape',
      category: 'canvas',
      do(data) {
        const { initialShape } = after

        const page = tld.getPage(data)

        page.shapes[initialShape.id] = initialShape

        const shape = page.shapes[initialShape.id]

        if (getShapeUtils(shape).shouldDelete(shape)) {
          delete page.shapes[initialShape.id]
        }
      },
      undo(data) {
        const { initialShape } = before

        const page = tld.getPage(data)

        page.shapes[initialShape.id] = initialShape
      },
    })
  )
}
