/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Utils, Vec } from '@tldraw/core'
import { TLDR } from '~state/tldr'
import type { Data, PagePartial, TLDrawCommand } from '~types'

export function duplicate(data: Data, ids: string[]): TLDrawCommand {
  const { currentPageId } = data.appState

  const page = TLDR.getPage(data, currentPageId)

  const delta = Vec.div([16, 16], TLDR.getCamera(data, currentPageId).zoom)

  const before: PagePartial = {
    shapes: {},
    bindings: {},
  }

  const after: PagePartial = {
    shapes: {},
    bindings: {},
  }

  const shapes = TLDR.getSelectedIds(data, currentPageId).map((id) =>
    TLDR.getShape(data, id, currentPageId)
  )

  const duplicateMap: Record<string, string> = {}

  // Create duplicates
  shapes
    .filter((shape) => !ids.includes(shape.parentId))
    .forEach((shape) => {
      const id = Utils.uniqueId()
      before.shapes[id] = undefined
      after.shapes[id] = {
        ...Utils.deepClone(shape),
        id,
        point: Vec.round(Vec.add(shape.point, delta)),
      }
      if (shape.children) {
        after.shapes[id]!.children = []
      }
      duplicateMap[shape.id] = id
    })

  // If the shapes have children, then duplicate those too
  shapes.forEach((shape) => {
    if (shape.children) {
      shape.children.forEach((childId) => {
        const child = TLDR.getShape(data, childId, currentPageId)
        const duplicatedId = Utils.uniqueId()
        const duplicatedParentId = duplicateMap[shape.id]
        before.shapes[duplicatedId] = undefined
        after.shapes[duplicatedId] = {
          ...Utils.deepClone(child),
          id: duplicatedId,
          parentId: duplicatedParentId,
        }
        duplicateMap[childId] = duplicatedId
        after.shapes[duplicateMap[shape.id]]?.children?.push(duplicatedId)
      })
    }
  })

  // Which ids did we end up duplicating?
  const duplicatedShapeIds = Object.keys(duplicateMap)

  // Handle bindings that effect duplicated shapes
  Object.values(page.bindings).forEach((binding) => {
    if (duplicatedShapeIds.includes(binding.fromId)) {
      if (duplicatedShapeIds.includes(binding.toId)) {
        // If the binding is between two duplicating shapes then
        // duplicate the binding, too
        const duplicatedBindingId = Utils.uniqueId()

        const duplicatedBinding = {
          ...Utils.deepClone(binding),
          id: duplicatedBindingId,
          fromId: duplicateMap[binding.fromId],
          toId: duplicateMap[binding.toId],
        }

        before.bindings[duplicatedBindingId] = undefined
        after.bindings[duplicatedBindingId] = duplicatedBinding

        // Change the duplicated shape's handle so that it reference
        // the duplicated binding
        const boundShape = after.shapes[duplicatedBinding.fromId]
        Object.values(boundShape!.handles!).forEach((handle) => {
          if (handle!.bindingId === binding.id) {
            handle!.bindingId = duplicatedBindingId
          }
        })
      } else {
        // If only the fromId is selected, delete the binding on
        // the duplicated shape's handles
        const boundShape = after.shapes[duplicateMap[binding.fromId]]
        Object.values(boundShape!.handles!).forEach((handle) => {
          if (handle!.bindingId === binding.id) {
            handle!.bindingId = undefined
          }
        })
      }
    }
  })

  return {
    id: 'duplicate',
    before: {
      document: {
        pages: {
          [currentPageId]: before,
        },
        pageStates: {
          [currentPageId]: { selectedIds: ids },
        },
      },
    },
    after: {
      document: {
        pages: {
          [currentPageId]: after,
        },
        pageStates: {
          [currentPageId]: { selectedIds: Object.keys(after.shapes) },
        },
      },
    },
  }
}
