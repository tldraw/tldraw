import { getShapeUtils } from '../../../shape'
import { Data } from '../../../types'
import { TranslateSnapshot } from '../../session'
import { TLD } from '../../tld'
import { Command } from '../command'

export function translate(
  data: Data,
  before: TranslateSnapshot,
  after: TranslateSnapshot,
  isCloning = false,
) {
  return new Command({
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
        TLD.getDocumentBranch(data, id).forEach((id) => {
          const shape = shapes[id]
          getShapeUtils(shape).translateTo(shape, point)
        })
      }

      const ids = initialShapes.map((shape) => shape.id)

      TLD.setSelectedIds(data, ids)
      TLD.updateBindings(data, ids)
      TLD.updateParents(data, ids)
    },
    undo(data) {
      const { initialShapes, clones, initialParents } = before
      const { shapes } = data.page

      // Move shapes back to where they started
      for (const { id, point } of initialShapes) {
        TLD.getDocumentBranch(data, id).forEach((id) => {
          const shape = shapes[id]
          getShapeUtils(shape).translateTo(shape, point)
        })
      }

      // Delete clones
      if (isCloning) for (const { id } of clones) delete shapes[id]

      const ids = initialShapes.map((shape) => shape.id)

      // Restore children on parents
      initialParents.forEach(({ id, children }) => {
        const parent = shapes[id]
        getShapeUtils(parent).setProperty(parent, 'children', children)
      })

      TLD.setSelectedIds(data, ids)
      TLD.updateBindings(data, ids)
      TLD.updateParents(data, ids)
    },
  })
}
