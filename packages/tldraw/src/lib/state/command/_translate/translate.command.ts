import { getShapeUtils } from '../../../shape'
import { Data } from '../../../types'
import { TranslateSnapshot } from '../../sessions'
import { state } from '../../state'
import { Command } from '../command'

export function translate(data: Data, before: TranslateSnapshot, after: TranslateSnapshot, isCloning = false): void {
  const command = new Command({
    name: 'translate_shapes',
    category: 'canvas',
    manualSelection: true,
    do(data, initial) {
      if (initial) return

      const { initialShapes } = after
      const { shapes } = data.page

      // Restore clones to document
      if (isCloning) {
        for (const clone of before.clones) {
          shapes[clone.id] = clone
          if (clone.parentId !== data.page.id) {
            const parent = shapes[clone.parentId]

            if (!parent.children) {
              throw Error('Parent has no children array!')
            }

            getShapeUtils(parent).setProperty(parent, 'children', [...parent.children, clone.id])

            // TODO: Groups
          }
        }
      }

      // Move shapes (these initialShapes will include clones if any)
      for (const { id, point } of initialShapes) {
        state.getDocumentBranch(data, id).forEach((id) => {
          const shape = shapes[id]
          getShapeUtils(shape).translateTo(shape, point)
        })
      }

      // Set selected shapes
      state.setSelectedIds(
        data,
        initialShapes.map((s) => s.id),
      )

      // Update parents
      state.updateParents(
        data,
        initialShapes.map((s) => s.id),
      )
    },
    undo(data) {
      const { initialShapes, clones, initialParents } = before
      const { shapes } = data.page

      // Move shapes back to where they started
      for (const { id, point } of initialShapes) {
        state.getDocumentBranch(data, id).forEach((id) => {
          const shape = shapes[id]
          getShapeUtils(shape).translateTo(shape, point)
        })
      }

      // Delete clones
      if (isCloning) for (const { id } of clones) delete shapes[id]

      // Set selected shapes
      state.setSelectedIds(
        data,
        initialShapes.map((s) => s.id),
      )

      // Restore children on parents
      initialParents.forEach(({ id, children }) => {
        const parent = shapes[id]
        getShapeUtils(parent).setProperty(parent, 'children', children)
      })

      // Update parents
      state.updateParents(
        data,
        initialShapes.map((s) => s.id),
      )
    },
  })

  state.history.execute(data, command)
}
