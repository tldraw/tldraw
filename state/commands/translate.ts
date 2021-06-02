import Command from './command'
import history from '../history'
import { TranslateSnapshot } from 'state/sessions/translate-session'
import { Data } from 'types'
import { getPage } from 'utils/utils'
import { getShapeUtils } from 'lib/shape-utils'

export default function translateCommand(
  data: Data,
  before: TranslateSnapshot,
  after: TranslateSnapshot,
  isCloning: boolean
) {
  history.execute(
    data,
    new Command({
      name: isCloning ? 'clone_shapes' : 'translate_shapes',
      category: 'canvas',
      manualSelection: true,
      do(data, initial) {
        if (initial) return

        const { initialShapes, currentPageId } = after
        const { shapes } = getPage(data, currentPageId)
        const { clones } = before // !

        data.selectedIds.clear()

        if (isCloning) {
          for (const clone of clones) {
            shapes[clone.id] = clone
          }
        }

        for (const { id, point } of initialShapes) {
          const shape = shapes[id]
          getShapeUtils(shape).setProperty(shape, 'point', point)
          data.selectedIds.add(id)
        }
      },
      undo(data) {
        const { initialShapes, clones, currentPageId } = before
        const { shapes } = getPage(data, currentPageId)

        data.selectedIds.clear()

        if (isCloning) {
          for (const { id } of clones) {
            delete shapes[id]
          }
        }

        for (const { id, point } of initialShapes) {
          const shape = shapes[id]
          getShapeUtils(shape).setProperty(shape, 'point', point)
          data.selectedIds.add(id)
        }
      },
    })
  )
}
