import Command from './command'
import history from '../history'
import { TranslateSnapshot } from 'state/sessions/translate-session'
import { Data, GroupShape, Shape, ShapeType } from 'types'
import {
  getDocumentBranch,
  getPage,
  setSelectedIds,
  updateParents,
} from 'utils/utils'
import { getShapeUtils } from 'lib/shape-utils'
import { v4 as uuid } from 'uuid'

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

        // Restore clones to document
        if (isCloning) {
          for (const clone of before.clones) {
            shapes[clone.id] = clone
            if (clone.parentId !== data.currentPageId) {
              const parent = shapes[clone.parentId]
              getShapeUtils(parent).setProperty(parent, 'children', [
                ...parent.children,
                clone.id,
              ])

              if (clone.type === ShapeType.Group) {
              }
            }
          }
        }

        // Move shapes (these initialShapes will include clones if any)
        for (const { id, point } of initialShapes) {
          getDocumentBranch(data, id).forEach((id) => {
            const shape = shapes[id]
            getShapeUtils(shape).translateTo(shape, point)
          })
        }

        // Set selected shapes
        setSelectedIds(
          data,
          initialShapes.map((s) => s.id)
        )

        // Update parents
        updateParents(
          data,
          initialShapes.map((s) => s.id)
        )
      },
      undo(data) {
        const { initialShapes, clones, currentPageId, initialParents } = before
        const { shapes } = getPage(data, currentPageId)

        // Move shapes back to where they started
        for (const { id, point } of initialShapes) {
          const shape = shapes[id]
          getShapeUtils(shape).translateTo(shape, point)
        }

        // Delete clones
        if (isCloning) for (const { id } of clones) delete shapes[id]

        // Set selected shapes
        setSelectedIds(
          data,
          initialShapes.map((s) => s.id)
        )

        // Restore children on parents
        initialParents.forEach(({ id, children }) => {
          const parent = shapes[id]
          getShapeUtils(parent).setProperty(parent, 'children', children)
        })

        // Update parents
        updateParents(
          data,
          initialShapes.map((s) => s.id)
        )
      },
    })
  )
}
